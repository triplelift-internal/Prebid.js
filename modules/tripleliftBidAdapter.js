import * as utils from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';
import { config } from '../src/config.js';

export const TL_ENDPOINT = 'https://tlx.3lift.com/header/auction?';
export let SYNC_ENDPOINT = 'https://eb2.3lift.com/sync?';
const BIDDER_CODE = 'triplelift';
const BANNER_TIME_TO_LIVE = 300;
const VIDEO_TIME_TO_LIVE = 3600;
let gdprApplies = null;
let consentString = null;

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

const converter = ortbConverter({
  context: {
    ttl: BANNER_TIME_TO_LIVE,
    netRevenue: true
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (bidRequest.params.inventoryCode) {
      imp.tagid = bidRequest.params.inventoryCode;
    }
    if (isValidVideo(bidRequest)) {
      const mediaTypesVideo = utils.deepAccess(bidRequest, 'mediaTypes.video');
      const videoParams = utils.deepAccess(bidRequest, 'params.video') || {};

      const video = {...mediaTypesVideo, ...videoParams};

      if ((video.w == null || video.h == null) && video.playerSize) {
        // playerSize can be a single size [w, h] or array of sizes [[w, h], ...]
        const size = Array.isArray(video.playerSize[0]) ? video.playerSize[0] : video.playerSize;
        if (Array.isArray(size) && size.length >= 2) {
          if (video.w == null) video.w = size[0];
          if (video.h == null) video.h = size[1];
        }
      }
      if (video.playerSize) delete video.playerSize;

      if (Number.isInteger(video.playbackmethod)) {
        video.playbackmethod = [video.playbackmethod];
      }

      utils.mergeDeep(imp, {
        video: video
      });
    }
    if (isInstreamRequest(bidRequest)) {
      // Remove banner set by the default ortbConverter processor if instream
      delete imp.banner;
    } else if (isBannerRequest(bidRequest)) {
      utils.mergeDeep(imp, {
        banner: {
          format: formatSizes(bidRequest.sizes)
        }
      });
    }
    if (isNativeRequest(bidRequest)) {
      const nativeParams = utils.deepAccess(bidRequest, 'mediaTypes.native');
      if (nativeParams && nativeParams.ortb) {
        utils.mergeDeep(imp, {
          native: nativeParams.ortb
        });
      }
    }

    setBidFloors(bidRequest, imp);

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);

    const bid = context.bidRequests[0];
    const ortb2Eids = utils.deepAccess(bid, 'ortb2.user.ext.eids');
    const userIdEids = utils.deepAccess(bid, 'userIdAsEids');
    const eids = Array.isArray(ortb2Eids) && ortb2Eids.length
      ? ortb2Eids : (Array.isArray(userIdEids) && userIdEids.length ? userIdEids : null);
    if (eids) {
      utils.mergeDeep(req, { user: { ext: { eids } } });
    }

    const opeCloud = getOpeCloud();
    if (opeCloud) {
      utils.mergeDeep(req, {
        user: {
          data: [{
            name: 'www.1plusx.com',
            ext: opeCloud
          }]
        }
      });
    }

    return req;
  }
});

export const spec = {
  code: 'triplelift',
  gvlid: 28,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: function (bid) {
    return bid.params?.inventoryCode !== undefined;
  },
  buildRequests: function(bidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests, bidderRequest});

    const requestUrl = buildRequestUrl(bidRequests, bidderRequest);

    return [{
      method: 'POST',
      url: requestUrl,
      data
    }]
  },
  interpretResponse: function(response, {bidderRequest}) {
    let bids = response?.body?.bids || [];

    bids = bids.map(bid => buildBidResponse(bid, bidderRequest));

    return bids;
  },
  getUserSyncs: function(syncOptions, responses, gdprConsent, usPrivacy, gppConsent) {
    const syncType = getSyncType(syncOptions);
    if (!syncType) return;

    let syncEndpoint = SYNC_ENDPOINT;

    if (syncType === 'image') {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'px', 1);
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'src', 'prebid');
    }

    let effectiveGdprApplies = gdprApplies;
    let effectiveConsentString = consentString;

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies !== 'undefined') {
        effectiveGdprApplies = gdprConsent.gdprApplies;
      }
      if (typeof gdprConsent.consentString !== 'undefined') {
        effectiveConsentString = gdprConsent.consentString;
      }
    }

    if (effectiveGdprApplies) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gdpr', effectiveGdprApplies);
    }

    if (effectiveConsentString !== null) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'cmp_cs', effectiveConsentString);
    }

    if (usPrivacy) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'us_privacy', usPrivacy);
    }

    if (gppConsent) {
      if (gppConsent.gppString) {
        syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp', gppConsent.gppString);
      }
      if (gppConsent.applicableSections && gppConsent.applicableSections.length !== 0) {
        syncEndpoint = tryAppendQueryString(syncEndpoint, 'gpp_sid', formatSid(gppConsent.applicableSections));
      }
    }

    return [{
      type: syncType,
      url: syncEndpoint
    }];
  }
}

function formatSid(sid) {
  return sid.filter(element => {
    return Number.isInteger(element);
  })
    .join(',');
}

function getSyncType(syncOptions) {
  if (!syncOptions) return;
  if (syncOptions.iframeEnabled) return 'iframe';
  if (syncOptions.pixelEnabled) return 'image';
}

function getBidFloor(bidRequest) {
  let floor = null;
  if (typeof bidRequest.getFloor === 'function') {
    try {
      const floorData = bidRequest.getFloor({
        currency: 'USD',
        mediaType: isValidVideo(bidRequest) ? 'video' : (isNativeRequest(bidRequest) ? 'native' : 'banner'),
        size: '*'
      });
      if (floorData && floorData.currency === 'USD' && !isNaN(floorData.floor)) {
        floor = parseFloat(floorData.floor);
      }
    } catch (e) {
      utils.logError('Triplelift: error calling getFloor: ', e);
    }
  }

  return floor !== null ? floor : parseFloat(utils.deepAccess(bidRequest, 'params.floor'));
}

function setBidFloors(bidRequest, imp) {
  if (imp.bidfloorcur !== 'USD') {
    delete imp.bidfloor;
    delete imp.bidfloorcur;
  } else if (imp.bidfloor) {
    imp.floor = imp.bidfloor;

    delete imp.bidfloor;
    delete imp.bidfloorcur;
  }

  if (imp.floor == null) {
    const bidFloor = getBidFloor(bidRequest);

    if (!isNaN(bidFloor)) {
      imp.floor = bidFloor;
    }
  }
}

function buildRequestUrl(bidRequests, bidderRequest) {
  let url = TL_ENDPOINT;

  url = tryAppendQueryString(url, 'lib', 'prebid');
  url = tryAppendQueryString(url, 'v', '$prebid.version$');

  if (bidderRequest && bidderRequest.refererInfo) {
    const referrer = bidderRequest.refererInfo.page;
    url = tryAppendQueryString(url, 'referrer', referrer);
  }

  if (bidderRequest && bidderRequest.timeout) {
    url = tryAppendQueryString(url, 'tmax', bidderRequest.timeout);
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
      gdprApplies = bidderRequest.gdprConsent.gdprApplies;
    } else {
      gdprApplies = true;
    }

    url = tryAppendQueryString(url, 'gdpr', gdprApplies.toString());

    if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
      consentString = bidderRequest.gdprConsent.consentString;
      url = tryAppendQueryString(url, 'cmp_cs', consentString);
    }
  }

  if (bidderRequest && bidderRequest.uspConsent) {
    url = tryAppendQueryString(url, 'us_privacy', bidderRequest.uspConsent);
  }

  if (config.getConfig('coppa') === true) {
    url = tryAppendQueryString(url, 'coppa', true);
  }

  if (url.lastIndexOf('&') === url.length - 1) {
    url = url.substring(0, url.length - 1);
  }

  return url;
}

function getOpeCloud() {
  const opeCloud = storage.getDataFromLocalStorage('opecloud_ctx');
  if (!opeCloud) return null;
  try {
    return JSON.parse(opeCloud);
  } catch (err) {
    utils.logError('Triplelift: error parsing opeCloud JSON: ', err);
    return null;
  }
}

function formatSizes(sizes) {
  if (!Array.isArray(sizes)) {
    return [];
  }

  return sizes
    .filter(isValidSize)
    .map(([w, h]) => ({ w, h }));
}

function isValidSize(size) {
  return (size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number');
}

function getVideoContext(bidRequest) {
  const context = utils.deepAccess(bidRequest, 'mediaTypes.video.context');
  return typeof context === 'string' ? context.toLowerCase() : null;
}

function isValidVideo(bidRequest) {
  return getVideoContext(bidRequest) !== null;
}

function isNativeRequest(bidRequest) {
  return utils.deepAccess(bidRequest, 'mediaTypes.native.ortb');
}

function isBannerRequest(bidRequest) {
  return utils.deepAccess(bidRequest, 'mediaTypes.banner');
}

function isInstreamRequest(bidRequest) {
  return getVideoContext(bidRequest) === 'instream';
}

function isOutstreamRequest(bidRequest) {
  return getVideoContext(bidRequest) === 'outstream';
}

function isVideoRequest(bidRequest) {
  return isInstreamRequest(bidRequest) || isOutstreamRequest(bidRequest);
}

function parseNativeAd(bidRequest, bid) {
  if (!isNativeRequest(bidRequest)) {
    return null;
  }
  const nativeAd = bid.ad;
  if (!nativeAd) {
    return null;
  }
  try {
    const parsedAd = JSON.parse(nativeAd);
    return parsedAd.assets ? parsedAd : null;
  } catch (e) {
    utils.logError('Triplelift: error parsing native ad JSON: ', e);
    return null;
  }
}

function buildBidResponse(bid, bidderRequest) {
  let bidResponse = {};
  const width = bid.width || 1;
  const height = bid.height || 1;
  const dealId = bid.deal_id || '';
  const creativeId = bid.crid || '';

  const breq = bidderRequest.bids?.[bid.imp_id];
  if (!breq) return {};

  if (bid.cpm !== 0 && bid.ad) {
    const nativeAd = parseNativeAd(breq, bid);
    const baseBidResponse = {
      requestId: breq.bidId,
      cpm: bid.cpm,
      netRevenue: true,
      creativeId: creativeId,
      dealId: dealId,
      currency: 'USD',
      ttl: BANNER_TIME_TO_LIVE,
      tl_source: bid.tl_source,
      meta: {}
    }
    if (nativeAd) {
      bidResponse = {
        ...baseBidResponse,
        native: { ortb: nativeAd }
      }
    } else {
      bidResponse = {
        ...baseBidResponse,
        width: width,
        height: height,
        ad: bid.ad,
      }
    }

    if (isVideoRequest(breq) && bid.media_type === 'video') {
      bidResponse.vastXml = bid.ad;
      bidResponse.mediaType = 'video';
      bidResponse.ttl = VIDEO_TIME_TO_LIVE;
    }

    if (bid.advertiser_name) {
      bidResponse.meta.advertiserName = bid.advertiser_name;
    }

    if (bid.adomain && bid.adomain.length) {
      bidResponse.meta.advertiserDomains = bid.adomain;
    }

    if (bid.tl_source === 'hdx') {
      if (isVideoRequest(breq) && bid.media_type === 'video') {
        bidResponse.meta.mediaType = 'video'
      } else {
        bidResponse.meta.mediaType = 'banner';
      }
    }

    if (bid.tl_source === 'tlx') {
      bidResponse.meta.mediaType = 'native';
    }

    if (creativeId) {
      const idx = creativeId.indexOf('_');
      if (idx > 0) bidResponse.meta.networkId = creativeId.slice(0, idx);
    }
  }
  return bidResponse;
}

registerBidder(spec);
