import https from 'https';
import http from 'http';
import fs from 'fs';

/**
 * Parse GitHub URL to extract owner and repo
 * Supports formats:
 * - https://github.com/owner/repo
 * - github.com/owner/repo
 * - owner/repo
 * - https://github.com/owner/repo/releases
 */
export function parseGitHubUrl(url) {
    const patterns = [
        /github\.com\/([^\/]+)\/([^\/\s]+)/,
        /^([^\/\s]+)\/([^\/\s]+)$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace(/\.git$/, '').replace(/\/.*$/, '')
            };
        }
    }

    return null;
}

/**
 * Fetch latest release from GitHub API
 */
export async function getLatestRelease(owner, repo) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/releases/latest`,
            headers: {
                'User-Agent': 'ASHIGARU-PackageManager',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        };

        const req = https.get(options, (res) => {
            if (res.statusCode === 404) {
                reject(new Error('No releases found for this repository'));
                return;
            }

            if (res.statusCode === 403) {
                reject(new Error('GitHub API rate limit exceeded - try again later'));
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`GitHub API error: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const release = JSON.parse(data);

                    // Find suitable asset (prefer .tar.gz, then .zip)
                    let downloadUrl = release.tarball_url; // Default to GitHub's auto-generated tarball
                    let assetName = `${repo}-${release.tag_name}.tar.gz`;

                    if (release.assets && release.assets.length > 0) {
                        const tarAsset = release.assets.find(a => a.name.endsWith('.tar.gz'));
                        const zipAsset = release.assets.find(a => a.name.endsWith('.zip'));

                        if (tarAsset) {
                            downloadUrl = tarAsset.browser_download_url;
                            assetName = tarAsset.name;
                        } else if (zipAsset) {
                            downloadUrl = zipAsset.browser_download_url;
                            assetName = zipAsset.name;
                        }
                    }

                    resolve({
                        version: release.tag_name.replace(/^v/, ''),
                        tagName: release.tag_name,
                        name: release.name || release.tag_name,
                        notes: release.body || 'No release notes available',
                        downloadUrl,
                        assetName,
                        publishedAt: release.published_at
                    });
                } catch (err) {
                    reject(new Error('Failed to parse GitHub response'));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });

        req.on('error', (err) => {
            if (err.code === 'ENOTFOUND') {
                reject(new Error('No internet connection'));
            } else {
                reject(err);
            }
        });
    });
}

/**
 * Fetch all releases from GitHub API
 */
export async function getAllReleases(owner, repo) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/releases`,
            headers: {
                'User-Agent': 'ASHIGARU-PackageManager',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        };

        const req = https.get(options, (res) => {
            if (res.statusCode === 404) {
                reject(new Error('Repository not found'));
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`GitHub API error: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const releases = JSON.parse(data);
                    resolve(releases.map(r => ({
                        version: r.tag_name.replace(/^v/, ''),
                        tagName: r.tag_name,
                        name: r.name || r.tag_name,
                        tarballUrl: r.tarball_url,
                        publishedAt: r.published_at
                    })));
                } catch (err) {
                    reject(new Error('Failed to parse GitHub response'));
                }
            });
        });

        req.on('error', reject);
    });
}
