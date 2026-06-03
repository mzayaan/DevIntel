// ============================================
// ADS — Google AdSense + Google Play IAP
// Depends on: config.js (CONFIG.ADS, CONFIG.IAP)
// Provides:   window.ADS
//
// Ad serving:  Google AdSense (web layer — works in TWA Chrome Custom Tab)
// IAP:         Digital Goods API + Payment Request API
//              (Google's official TWA billing bridge — no Kotlin needed)
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

  function isAdsRemoved()     { return _get('devintelRemoveAds')    === 'true'; }
  function isIAPPurchased()   { return _get('devintelIAPPurchased') === 'true'; }
  function setAdsRemoved(v)   { _set('devintelRemoveAds', v ? 'true' : 'false'); }

  // ---- Digital Goods API detection (only present inside TWA) ----
  function _inTWA() { return typeof window.getDigitalGoodsService === 'function'; }

  // ============================================
  // IN-APP PURCHASE (Digital Goods API)
  // ============================================

  // Called on every app launch — verifies purchase with Google Play and
  // handles reinstalls / refunds automatically.
  async function _verifyPurchaseWithPlay() {
    if (!_inTWA()) return;
    try {
      var service = await window.getDigitalGoodsService('https://play.google.com/billing');
      var purchases = await service.listPurchases();
      var active = purchases.some(function (p) {
        return p.itemId === CONFIG.IAP.PRODUCT_ID;
      });
      if (active) {
        _grantAdFree(false); // silent — no notification on restore
      } else if (isIAPPurchased()) {
        // Google Play says no active purchase (refunded or revoked) — reset
        _set('devintelIAPPurchased', 'false');
        setAdsRemoved(false);
        _adsEnabled = true;
        _syncRemoveAdsBtn();
      }
    } catch (_) { /* Play unavailable — trust local state */ }
  }

  // Grant ad-free status, persist it, update UI.
  function _grantAdFree(notify) {
    _set('devintelIAPPurchased', 'true');
    setAdsRemoved(true);
    _adsEnabled = false;

    // Remove all ad elements immediately
    document.querySelectorAll('.ad-card, #adBannerContainer, #adConsentBanner').forEach(function (el) {
      el.remove();
    });
    document.body.classList.remove('ad-banner-active');
    _syncRemoveAdsBtn();

    if (notify !== false && typeof showNotification === 'function') {
      showNotification('Ads removed — thank you for supporting DevIntel! ✓');
    }
  }

  // Show the IAP confirmation dialog, then launch the billing flow.
  function initiateIAP() {
    if (isIAPPurchased()) {
      // Already purchased — nothing to do
      if (typeof showNotification === 'function') showNotification('You\'re already ad-free ✓', 'info');
      return;
    }

    if (_inTWA()) {
      _showIAPDialog();
    } else {
      // Running in a browser — IAP only works inside the Android app.
      // Show informational message; fall back to free toggle for dev testing.
      _showBrowserIAPNotice();
    }
  }

  // The purchase dialog shown before billing flow launches.
  function _showIAPDialog() {
    if (document.getElementById('iapDialog')) return;

    var overlay = document.createElement('div');
    overlay.id = 'iapDialog';
    overlay.className = 'ad-interstitial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Go ad-free');
    overlay.innerHTML =
      '<div class="iap-dialog">' +
        '<div class="iap-dialog-header">' +
          '<h2 class="iap-title">Go Ad-Free Forever</h2>' +
          '<button id="iapDialogClose" class="ad-close-btn" aria-label="Close">&#x2715;</button>' +
        '</div>' +
        '<p class="iap-subtitle">Remove all ads with a single one-time payment.</p>' +
        '<ul class="iap-benefits">' +
          '<li>&#10003; No banner ads</li>' +
          '<li>&#10003; No interstitial ads</li>' +
          '<li>&#10003; No sponsored feed cards</li>' +
          '<li>&#10003; Forever &mdash; no subscription</li>' +
          '<li>&#10003; Restores automatically on reinstall</li>' +
          '<li>&#9889; Offline access bonus &mdash; always free</li>' +
        '</ul>' +
        '<button id="iapBuyBtn" class="iap-buy-btn" disabled>' +
          '<span id="iapBuyLabel">Loading price&#8230;</span>' +
        '</button>' +
        '<button id="iapRestoreBtn" class="iap-restore-btn">Restore previous purchase</button>' +
        '<button id="iapCancelBtn" class="ad-cancel-btn">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('iapDialogClose').onclick  = _closeIAPDialog;
    document.getElementById('iapCancelBtn').onclick    = _closeIAPDialog;
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _closeIAPDialog(); });
    document.getElementById('iapRestoreBtn').onclick   = function () { _closeIAPDialog(); restorePurchase(); };
    document.getElementById('iapBuyBtn').onclick       = _launchBillingFlow;

    // Fetch real price from Google Play
    _fetchProductPrice();
  }

  function _closeIAPDialog() {
    var d = document.getElementById('iapDialog');
    if (d) d.remove();
  }

  async function _fetchProductPrice() {
    var btn   = document.getElementById('iapBuyBtn');
    var label = document.getElementById('iapBuyLabel');
    if (!btn || !label) return;
    try {
      var service = await window.getDigitalGoodsService('https://play.google.com/billing');
      var details = await service.getDetails([CONFIG.IAP.PRODUCT_ID]);
      if (details && details.length > 0) {
        var price = details[0].price ? details[0].price.value + ' ' + details[0].price.currency : '';
        label.textContent = price ? 'Remove Ads — ' + price : 'Remove Ads';
      } else {
        label.textContent = 'Remove Ads';
      }
      btn.disabled = false;
    } catch (_) {
      label.textContent = 'Remove Ads';
      btn.disabled = false;
    }
  }

  async function _launchBillingFlow() {
    _closeIAPDialog();
    try {
      var request = new PaymentRequest(
        [{ supportedMethods: 'https://play.google.com/billing',
           data: { sku: CONFIG.IAP.PRODUCT_ID } }],
        { total: { label: 'Remove Ads', amount: { currency: 'USD', value: '0' } } }
      );

      var canPay = await request.canMakePayment();
      if (!canPay) {
        if (typeof showNotification === 'function') showNotification('Google Play Billing unavailable', 'error');
        return;
      }

      var response = await request.show();
      if (!response) return;

      // Acknowledge the purchase via Digital Goods API (required or it refunds)
      try {
        var service = await window.getDigitalGoodsService('https://play.google.com/billing');
        await service.acknowledge(response.details.token, 'onetime');
      } catch (_) { /* acknowledge failure is non-fatal — retry on next launch */ }

      await response.complete('success');
      _grantAdFree(true);
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user cancelled — silent
      if (typeof showNotification === 'function') showNotification('Purchase failed. Please try again.', 'error');
    }
  }

  // Restore a previous purchase (for reinstalls / device switches).
  async function restorePurchase() {
    if (!_inTWA()) {
      if (typeof showNotification === 'function') showNotification('Restore is only available in the Android app', 'info');
      return;
    }
    try {
      var service   = await window.getDigitalGoodsService('https://play.google.com/billing');
      var purchases = await service.listPurchases();
      var found     = purchases.some(function (p) { return p.itemId === CONFIG.IAP.PRODUCT_ID; });
      if (found) {
        _grantAdFree(true);
        if (typeof showNotification === 'function') showNotification('Purchase restored ✓');
      } else {
        if (typeof showNotification === 'function') showNotification('No previous purchase found', 'info');
      }
    } catch (_) {
      if (typeof showNotification === 'function') showNotification('Restore failed. Check your connection.', 'error');
    }
  }

  // Shown when IAP is triggered from a browser (not TWA).
  function _showBrowserIAPNotice() {
    var overlay = document.createElement('div');
    overlay.className = 'ad-interstitial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Purchase info');
    overlay.innerHTML =
      '<div class="iap-dialog">' +
        '<h2 class="iap-title">Available in the Android App</h2>' +
        '<p class="iap-subtitle">The one-time "Remove Ads" purchase is available inside the DevIntel Android app on Google Play.</p>' +
        '<button id="browserIAPClose" class="iap-buy-btn">Got it</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('browserIAPClose').onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  }

  // Sidebar button sync — shows purchased state, normal state, or free-toggle state.
  function _syncRemoveAdsBtn() {
    var btn = document.getElementById('removeAdsBtn');
    if (!btn) return;
    var label = btn.querySelector('.sidebar-label');
    if (!label) return;

    if (isIAPPurchased()) {
      label.textContent = '✓ Ad-Free — Thank you!';
      btn.classList.add('iap-purchased');
      btn.disabled = true;
    } else if (isAdsRemoved()) {
      label.textContent = 'Restore Ads';
      btn.classList.remove('iap-purchased');
      btn.disabled = false;
    } else {
      label.textContent = _inTWA() ? 'Remove Ads' : 'Remove Ads';
      btn.classList.remove('iap-purchased');
      btn.disabled = false;
    }

    // Restore button visibility
    var restoreBtn = document.getElementById('restorePurchaseBtn');
    if (restoreBtn) restoreBtn.classList.toggle('hidden', isIAPPurchased());
  }

  // ============================================
  // AD SERVING (AdSense)
  // ============================================

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
    var freq  = CONFIG.ADS.AD_FREQUENCY;
    if (cards.length < freq) return;

    var temp = document.createElement('div');
    var insertAfter = [];
    for (var i = freq - 1; i < cards.length; i += freq) insertAfter.push(cards[i]);
    insertAfter.reverse().forEach(function (ref) {
      temp.innerHTML = _adCardHtml();
      ref.parentNode.insertBefore(temp.firstChild, ref.nextSibling);
      _push();
    });
  }

  function trackArticleOpen() { _sessionArticleCount++; }

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
    setTimeout(_dismiss, 12000);

    _lastInterstitialAt  = Date.now();
    _sessionArticleCount = 0;
  }

  function offerRewardedAd() {
    if (!_consentState && !isIAPPurchased()) { _showConsentBanner(); return; }
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
          '<span class="ad-label">' + (isIAPPurchased() ? 'Free Bonus' : 'Sponsored') + '</span>' +
          '<span id="rewardCountdown" class="ad-timer">' + secondsLeft + 's</span>' +
        '</div>' +
        '<p class="ad-rewarded-desc">' +
          (isIAPPurchased()
            ? 'As a thank-you for supporting DevIntel, unlock offline mode for 24 hours — on us.'
            : 'Watch this short ad to unlock offline mode for 24 hours.') +
        '</p>' +
        (isIAPPurchased() ? '' :
          '<ins class="adsbygoogle"' +
            ' style="display:block;width:300px;height:250px"' +
            ' data-ad-client="' + CONFIG.ADS.PUBLISHER_ID + '"' +
            ' data-ad-slot="' + CONFIG.ADS.REWARDED_SLOT + '"></ins>') +
        '<button id="rewardClaimBtn" class="ad-claim-btn' + (isIAPPurchased() ? '' : ' hidden') + '"' +
          (isIAPPurchased() ? '' : ' disabled') + '>Claim 24h offline access ✓</button>' +
        '<button id="rewardCancelBtn" class="ad-cancel-btn">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);
    if (!isIAPPurchased()) _push();

    var timerEl  = document.getElementById('rewardCountdown');
    var claimBtn = document.getElementById('rewardClaimBtn');

    if (isIAPPurchased()) {
      // Paying users skip the countdown
      if (timerEl) timerEl.textContent = '';
    } else {
      var timer = setInterval(function () {
        secondsLeft--;
        if (timerEl) timerEl.textContent = secondsLeft > 0 ? secondsLeft + 's' : '0s';
        if (secondsLeft <= 0) {
          clearInterval(timer);
          if (claimBtn) { claimBtn.classList.remove('hidden'); claimBtn.disabled = false; }
        }
      }, 1000);
      document.getElementById('rewardCancelBtn').onclick = function () { clearInterval(timer); overlay.remove(); };
    }

    claimBtn.onclick = function () {
      _set('devintelOfflineExpiry', String(Date.now() + 86400000));
      overlay.remove();
      _refreshOfflineBadge();
      if (typeof showNotification === 'function') showNotification('Offline access active for 24 hours ✓');
    };
    if (isIAPPurchased()) {
      document.getElementById('rewardCancelBtn').onclick = function () { overlay.remove(); };
    }
  }

  function _refreshOfflineBadge() {
    var expiry   = parseInt(_get('devintelOfflineExpiry') || '0', 10);
    var isActive = expiry > Date.now();
    document.querySelectorAll('.offline-badge').forEach(function (b) {
      b.classList.toggle('hidden', !isActive);
    });
  }

  // Free toggle — used only when not in TWA context (dev/browser testing).
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

  // ============================================
  // INIT
  // ============================================

  function init() {
    _syncRemoveAdsBtn();

    if (isAdsRemoved()) {
      _adsEnabled = false;
      // Still verify with Play on TWA to handle refunds
      if (_inTWA() && isIAPPurchased()) _verifyPurchaseWithPlay();
      _refreshOfflineBadge();
      return;
    }

    // Verify IAP on every launch (handles reinstalls & refunds)
    if (_inTWA()) _verifyPurchaseWithPlay();

    _refreshOfflineBadge();
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
    init:                  init,
    injectFeedAds:         injectFeedAds,
    trackArticleOpen:      trackArticleOpen,
    maybeShowInterstitial: maybeShowInterstitial,
    offerRewardedAd:       offerRewardedAd,
    initiateIAP:           initiateIAP,
    restorePurchase:       restorePurchase,
    toggleRemoveAds:       toggleRemoveAds,
    isAdsRemoved:          isAdsRemoved,
    isIAPPurchased:        isIAPPurchased,
    setAdsRemoved:         setAdsRemoved,
  };
}());
