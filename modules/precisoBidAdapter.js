import { logInfo } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { buildBidResponse, buildRequests, onBidWon } from '../libraries/precisoUtils/bidUtils.js';
import { buildUserSyncs } from '../libraries/precisoUtils/bidUtilsCommon.js';

const BIDDER__CODE = 'preciso';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER__CODE });
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const GVLID = 874;
let precisoId = 'NA';
let sharedId = 'NA';

const endpoint = 'https://ssp-bidder.2trk.info/bid_request/openrtb';
let syncEndpoint = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

export const spec = {
  code: BIDDER__CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    sharedId = storage.getDataFromLocalStorage('_sharedid') || storage.getCookie('_sharedid');
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisoId = storage.getDataFromLocalStorage('_pre|id');
    if (Object.is(precisoId, 'NA') || Object.is(precisoId, null) || Object.is(precisoId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },
  buildRequests: buildRequests(endpoint),
  interpretResponse: buildBidResponse,
  onBidWon,
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    syncEndpoint = syncEndpoint + 'id=' + sharedId;
    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, syncEndpoint);
  }
};

registerBidder(spec);

async function getapi(url) {
  try {
    const response = await fetch(url);
    var data = await response.json();

    const dataMap = new Map(Object.entries(data));
    const uuidValue = dataMap.get('UUID');

    if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
      if (storage.localStorageIsEnabled()) {
        storage.setDataInLocalStorage('_pre|id', uuidValue);
      }
    }
    return data;
  } catch (error) {
    logInfo('Error in preciso precall' + error);
  }
}
