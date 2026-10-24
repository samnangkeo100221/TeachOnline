/**
 * Universal Media Embed Engine for TeachOnline
 * Supports YouTube, YouTube Shorts, TikTok, Facebook Videos/Reels, and Direct MP4
 */

const MediaEmbed = {
  /**
   * Determine platform and return embed configuration
   * @param {string} url 
   * @returns {object} { platform: string, embedHtml: string, originalUrl: string }
   */
  renderVideo: function(url, containerId) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return '';
    }

    const cleanUrl = url.trim();
    
    // 1. YouTube standard & Shorts
    const ytId = this.extractYoutubeId(cleanUrl);
    if (ytId) {
      return `
        <div class="video-responsive-container">
          <iframe 
            src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1" 
            title="YouTube Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
          </iframe>
        </div>
        <div class="video-direct-link">
          <a href="${this.escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> បើកមើលក្នុង YouTube ផ្ទាល់
          </a>
        </div>
      `;
    }

    // 2. TikTok
    if (cleanUrl.includes('tiktok.com')) {
      const tiktokId = this.extractTikTokId(cleanUrl);
      if (tiktokId) {
        return `
          <div class="tiktok-embed-container" style="display:flex; justify-content:center; align-items:center; flex-direction:column; background:#000; border-radius:12px; padding:12px; overflow:hidden;">
            <iframe 
              src="https://www.tiktok.com/embed/v2/${tiktokId}" 
              style="width: 100%; max-width: 380px; height: 580px; border: none; border-radius: 8px;"
              allowfullscreen>
            </iframe>
            <div class="video-direct-link" style="margin-top:10px;">
              <a href="${this.escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" style="color:#00f2fe; text-decoration:none; font-weight:600;">
                <i class="fa-brands fa-tiktok"></i> បើកមើលក្នុង TikTok ផ្ទាល់
              </a>
            </div>
          </div>
        `;
      }
      return `
        <div class="video-fallback-box">
          <i class="fa-brands fa-tiktok fa-2x" style="color:#000;"></i>
          <p>វីដេអូ TikTok ៖ សូមចុចតំណភ្ជាប់ខាងក្រោមដើម្បីទស្សនា</p>
          <a href="${this.escapeHtml(cleanUrl)}" target="_blank" class="btn-open-external">
            <i class="fa-solid fa-play"></i> បើកមើលវីដេអូ TikTok
          </a>
        </div>
      `;
    }

    // 3. Facebook Video / Reel
    if (cleanUrl.includes('facebook.com') || cleanUrl.includes('fb.watch')) {
      const encodedUrl = encodeURIComponent(cleanUrl);
      return `
        <div class="fb-video-container" style="background:#f0f2f5; padding:10px; border-radius:12px; text-align:center;">
          <div class="video-responsive-container">
            <iframe 
              src="https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=560" 
              style="border:none;overflow:hidden" 
              scrolling="no" 
              frameborder="0" 
              allowfullscreen="true" 
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
          </div>
          <div class="video-direct-link" style="margin-top:8px;">
            <a href="${this.escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" style="color:#1877f2; text-decoration:none; font-weight:600;">
              <i class="fa-brands fa-facebook"></i> បើកមើលក្នុង Facebook ផ្ទាល់
            </a>
          </div>
        </div>
      `;
    }

    // 4. Direct Video file (.mp4, .webm, etc.)
    if (cleanUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      return `
        <div class="video-responsive-container" style="background:#000;">
          <video controls style="width:100%; height:100%; border-radius:12px;">
            <source src="${this.escapeHtml(cleanUrl)}">
            កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រការចាក់វីដេអូនេះទេ។
          </video>
        </div>
      `;
    }

    // 5. Generic Iframe or URL
    return `
      <div class="video-fallback-box">
        <i class="fa-solid fa-video fa-2x" style="color:var(--primary);"></i>
        <p>តំណភ្ជាប់វីដេអូ៖ ${this.escapeHtml(cleanUrl)}</p>
        <a href="${this.escapeHtml(cleanUrl)}" target="_blank" class="btn-open-external">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> ចុចបើកមើលវីដេអូ
        </a>
      </div>
    `;
  },

  /**
   * Extract YouTube ID from standard, shortened, or Shorts URLs
   */
  extractYoutubeId: function(url) {
    if (!url) return '';
    try {
      // Shorts: youtube.com/shorts/{id}
      const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
      if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

      // youtu.be/{id}
      const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
      if (shortUrlMatch && shortUrlMatch[1]) return shortUrlMatch[1];

      // youtube.com/watch?v={id}
      const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/i);
      if (watchMatch && watchMatch[1]) return watchMatch[1];

      // youtube.com/embed/{id}
      const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
      if (embedMatch && embedMatch[1]) return embedMatch[1];

      // Bare ID string (11 chars)
      if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        return url.trim();
      }
    } catch(e) {}
    return '';
  },

  /**
   * Extract TikTok video ID
   */
  extractTikTokId: function(url) {
    try {
      const match = url.match(/\/video\/(\d+)/i);
      if (match && match[1]) return match[1];
    } catch(e) {}
    return '';
  },

  escapeHtml: function(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

window.MediaEmbed = MediaEmbed;
