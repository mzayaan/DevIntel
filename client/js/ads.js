// ============================================
// ADS — Google AdSense web integration
// Depends on: config.js (CONFIG.ADS)
// Provides:   window.ADS
// ============================================
(function () {
  'use strict';

  if (!CONFIG.ADS || !CONFIG.ADS.ENABLED) return;

  var _sessionArticleCount = 0;
  var _sessionStart        = Date.now();
  var _lastInterstitialAt  = 0;
  var _consentState        = null;   // null | 'personalized' | 'non-personalized'
  var _adsEnabled          = true;

  // ---- localStorage helpers ----
  function _get(k)    { try { return localStorage.getItem(k);     } catch (_) { return null; } }
  function _set(k, v) { try { localStorage.setItem(k, String(v)); } catch (_) {} }

  function isAdsRemoved() { return _get('devintelRemoveAds') === 'true'; }

  function setAdsRemoved(v) { _set('devintelRemoveAds', v ? 'true' : 'false'); }

  // ---- Load the AdSense script once ----
  function _loadScript(nonPersonalized) {
    if (document.getElementById('_adsense_js')) return;
    var s = document.createElement('script');
    s.id    = '_adsense_js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
            CONFIG.ADS.PUBLISHER_ID;
    document.head.appendChild(s);
    if (nonPersonalized) {
      (window.adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: CONFIG.ADS.PUBLISHER_ID,
        enable_page_level_ads: true,
        requestNonPersonalizedAds: 1,
      });
    }
  }

  function _push() {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  }

  // ---- GDPR / consent banner ----
  function _showConsentBanner() {
    if (document.getElementById('adConsentBanner')) return;
    var el = document.createElement('div');
    el.id = 'adConsentBanner';
    el.className = 'ad-consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Ad personalisation consent');
    el.innerHTML =
      '<p class="ad-consent-text">' +
        'DevIntel uses ads to stay free. ' +
        '<a href="/privacy" class="ad-consent-link">Privacy&nbsp;policy</a>' +
      '</p>' +
      '<div class="ad-consent-actions">' +
        '<button id="adConsentAccept" class="ad-consent-btn accept">Accept</button>' +
        '<button id="adConsentDecline" class="ad-consent-btn decline">Non-personalised only</button>' +
      '</div>';
    document.body.appendChild(el);

    document.getElementById('adConsentAccept').onclick = function () {
      _set('devintelAdConsent', 'personalized');
      _consentState = 'personalized';
      el.remove();
      _loadScript(false);
      setTimeout(_showBannerAd, 800);
      setTimeout(_watchBookmarks, 1000);
    };
    document.getElementById('adConsentDecline').onclick = function () {
      _set('devintelAdConsent', 'non-personalized');
      _consentState = 'non-personalized';
      el.remove();
      _loadScript(true);
      setTimeout(_showBannerAd, 800);
      setTimeout(_watchBookmarks, 1000);
    };
  }

  // ---- Bottom banner ad ----
  function _showBannerAd() {
    var wrapper = document.getElementById('adBannerContainer');
    if (!wrapper) return;
    wrapper.innerHTML =
      '<ins class="adsbygoogle"' +
        ' style="display:block"' +
        ' data-ad-client="' + CONFIG.ADS.PUBLISHER_ID + '"' +
        ' data-ad-slot="' + CONFIG.ADS.BANNER_SLOT + '"' +
        ' data-ad-format="auto"' +
        ' data-full-width-responsive="true"></ins>';
    wrapper.classList.remove('hidden');
    document.body.classList.add('ad-banner-active');
    _push();
  }

  // Hide banner when bookmarks section is scrolled into view
  function _watchBookmarks() {
    var bmSection = document.getElementById('bookmarksSection');
    if (!bmSection || !window.IntersectionObserver) return;
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      var wrapper = document.getElementById('adBannerContainer');
      if (wrapper) wrapper.classList.toggle('hidden', visible);
      document.body.classList.toggle('ad-banner-active', !visible);
    }, { threshold: 0.15 });
    observer.observe(bmSection);
  }

  // ---- In-feed ad card (every 10th position) ----
  function _adCardHtml() {
    return '<article class="cyber-card ad-card" aria-label="Sponsored content">' +
      '<div class="meta-row"><span class="ad-label">Ad</span></div>' +
      '<ins class="adsbygoogle ad-infeed-ins"' +
        ' style="display:block"' +
        ' data-ad-format="fluid"' +
        ' data-ad-layout-key="' + CONFIG.ADS.INFEED_LAYOUT_KEY + '"' +
        ' data-ad-client="' + CONFIG.ADS.PUBLISHER_ID + '"' +
        ' data-ad-slot="' + CONFIG.ADS.INFEED_SLOT + '"></ins>' +
    '</article>';
  }

  function injectFeedAds(containerId) {
    if (!_adsEnabled || isAdsRemoved() || !_consentState) return;
    var container = document.getElementById(containerId);
    if (!container) return;
    var cards = Array.from(container.querySelectorAll('.cyber-card:not(.ad-card)'));
    var freq = CONFIG.ADS.AD_FREQUENCY;
    if (cards.length < freq) return;

    var temp = document.createElement('div');
    // Collect insertion points first; traverse in reverse to keep indices valid
    var insertAfter = [];
    for (var i = freq - 1; i < cards.length; i += freq) insertAfter.push(cards[i]);
    insertAfter.reverse().forEach(function (ref) {
      temp.innerHTML = _adCardHtml();
      ref.parentNode.insertBefore(temp.firstChild, ref.nextSibling);
      _push();
    });
  }

  // ---- Article-open session counter ----
  function trackArticleOpen() {
    _sessionArticleCount++;
  }

  // ---- Web interstitial (300×250 overlay, not full-screen) ----
  function maybeShowInterstitial() {
    if (!_adsEnabled || isAdsRemoved() || !_consentState) return;
    if (_sessionArticleCount < CONFIG.ADS.INTERSTITIAL_THRESHOLD) return;
    if (Date.now() - _sessionStart < CONFIG.ADS.SESSION_GRACE) return;
    if (Date.now() - _lastInterstitialAt < CONFIG.ADS.INTERSTITIAL_COOLDOWN) return;
    if (document.getElementById('webInterstitial')) return;

    var overlay = document.createElement('div');
    overlay.id = 'webInterstitial';
    overlay.className = 'ad-interstitial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Advertisement');
    overlay.innerHTML =
      '<div class="ad-interstitial-card">' +
        '<div class="ad-interstitial-header">' +
          '<span class="ad-label">Ad</span>' +
          '<button id="closeInterstitial" class="ad-close-btn" aria-label="Close ad">&#x2715;</button>' +
        '</div>' +
        '<ins class="adsbygoogle"' +
          ' style="display:block;width:300px;height:250px"' +
          ' data-ad-client="' + CONFIG.ADS.PUBLISHER_ID + '"' +
          ' data-ad-slot="' + CONFIG.ADS.INTERSTITIAL_SLOT + '"></ins>' +
      '</div>';
    document.body.appendChild(overlay);
    _push();

    function _dismiss() { if (overlay.parentNode) overlay.remove(); }
    document.getElementById('closeInterstitial').onclick = _dismiss;
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _dismiss(); });
    // Auto-close after 12 s if user ignores it
    setTimeout(_dismiss, 12000);

    _lastInterstitialAt  = Date.now();
    _sessionArticleCount = 0;
  }

  // ---- Rewarded ad (voluntary — user initiates) ----
  function offerRewardedAd() {
    if (isAdsRemoved()) return;
    if (!_consentState) { _showConsentBanner(); return; }
    if (document.getElementById('rewardedOverlay')) return;

    var secondsLeft = 5;
    var overlay = document.createElement('div');
    overlay.id = 'rewardedOverlay';
    overlay.className = 'ad-interstitial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Watch an ad for offline access');
    overlay.innerHTML =
      '<div class="ad-interstitial-card">' +
        '<div class="ad-interstitial-header">' +
          '<span class="ad-label">Sponsored</span>' +
          '<span id="rewardCountdown" class="ad-timer">' + secondsLeft + 's</span>' +
        '</div>' +
        '<p class="ad-rewarded-desc">Watch this short ad to unlock offline mode for 24 hours.</p>' +
        '<ins class="adsbygoogle"' +
          ' style="display:block;width:300px;height:250px"' +
          ' data-ad-client="' + CONFIG.ADS.PUBLISHER_ID + '"' +
          ' data-ad-slot="' + CONFIG.ADS.REWARDED_SLOT + '"></ins>' +
        '<button id="rewardClaimBtn" class="ad-claim-btn hidden" disabled>Claim 24h offline access ✓</button>' +
        '<button id="rewardCancelBtn" class="ad-cancel-btn">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);
    _push();

    var timerEl  = document.getElementById('rewardCountdown');
    var claimBtn = document.getElementById('rewardClaimBtn');
    var timer = setInterval(function () {
      secondsLeft--;
      if (timerEl) timerEl.textContent = secondsLeft > 0 ? secondsLeft + 's' : '0s';
      if (secondsLeft <= 0) {
        clearInterval(timer);
        if (claimBtn) { claimBtn.classList.remove('hidden'); claimBtn.disabled = false; }
      }
    }, 1000);

    claimBtn.onclick = function () {
      _set('devintelOfflineExpiry', String(Date.now() + 86400000));
      overlay.remove();
      _refreshOfflineBadge();
      if (typeof showNotification === 'function') showNotification('Offline access active for 24 hours ✓');
    };
    document.getElementById('rewardCancelBtn').onclick = function () {
      clearInterval(timer);
      overlay.remove();
    };
  }

  // ---- Offline badge ----
  function _refreshOfflineBadge() {
    var expiry  = parseInt(_get('devintelOfflineExpiry') || '0', 10);
    var isActive = expiry > Date.now();
    document.querySelectorAll('.offline-badge').forEach(function (b) {
      b.classList.toggle('hidden', !isActive);
    });
  }

  // ---- Remove Ads toggle ----
  function toggleRemoveAds() {
    var nowRemoved = !isAdsRemoved();
    setAdsRemoved(nowRemoved);
    if (nowRemoved) {
      _adsEnabled = false;
      document.querySelectorAll('.ad-card, #adBannerContainer, #adConsentBanner').forEach(function (el) { el.remove(); });
      document.body.classList.remove('ad-banner-active');
    } else {
      _adsEnabled = true;
      location.reload();
    }
    _syncRemoveAdsBtn();
    return nowRemoved;
  }

  function _syncRemoveAdsBtn() {
    var btn = document.getElementById('removeAdsBtn');
    if (btn) btn.querySelector('.sidebar-label').textContent = isAdsRemoved() ? 'Restore Ads' : 'Remove Ads';
  }

  // ---- Init ----
  function init() {
    if (isAdsRemoved()) { _adsEnabled = false; _syncRemoveAdsBtn(); return; }
    _refreshOfflineBadge();
    _syncRemoveAdsBtn();
    _consentState = _get('devintelAdConsent');
    if (_consentState === 'personalized' || _consentState === 'non-personalized') {
      _loadScript(_consentState === 'non-personalized');
      setTimeout(_showBannerAd, 800);
      setTimeout(_watchBookmarks, 1000);
    } else {
      setTimeout(_showConsentBanner, 3000);
    }
  }

  window.ADS = {
    init:             init,
    injectFeedAds:    injectFeedAds,
    trackArticleOpen: trackArticleOpen,
    maybeShowInterstitial: maybeShowInterstitial,
    offerRewardedAd:  offerRewardedAd,
    toggleRemoveAds:  toggleRemoveAds,
    isAdsRemoved:     isAdsRemoved,
  };
}());
