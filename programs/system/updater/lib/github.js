import https from 'https';
import fs from 'fs';

/**
 * Fetch latest release information from GitHub API
 * @returns {Promise<{version: string, tarballUrl: string, notes: string}>}
 */
export async function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/savannah-i-g/ASHIGARU/releases/latest',
      headers: {
        'User-Agent': 'ASHIGARU-Updater',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    const req = https.get(options, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('No releases found'));
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
          resolve({
            version: release.tag_name.replace(/^v/, ''),
            tarballUrl: release.tarball_url,
            notes: release.body || 'No release notes available'
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
 * Download a file with progress tracking
 * @param {string} url - Download URL
 * @param {string} dest - Destination file path
 * @param {function} onProgress - Progress callback (bytesDownloaded, totalBytes)
 * @returns {Promise<void>}
 */
export async function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'ASHIGARU-Updater' }
    }, (res) => {
      // Handle GitHub redirects
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location, dest, onProgress)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'], 10);
      let downloadedBytes = 0;
      const fileStream = fs.createWriteStream(dest);

      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (onProgress) {
          onProgress(downloadedBytes, totalBytes);
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(resolve);
      });

      fileStream.on('error', (err) => {
        fs.unlink(dest, () => {}); // Clean up on error
        reject(err);
      });

      res.on('error', (err) => {
        fs.unlink(dest, () => {}); // Clean up on error
        reject(err);
      });
    }).on('error', reject);
  });
}
