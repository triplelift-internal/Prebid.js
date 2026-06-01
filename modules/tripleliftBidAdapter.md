# Overview

```
Module Name:  Triplelift Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@triplelift.com
```

# Description

Connects to Triplelift Exchange for bids.
Triplelift bid adapter supports Banner, Video, and Native formats.

# Parameters

| Name | Scope | Type | Description |
|------|-------|------|-------------|
| inventoryCode | Required | String | TripleLift inventory code for the ad unit |
| floor | Optional | Number | Bid floor price in USD |
| sharedPublisherId | Optional | String | Shared publisher identifier; added to `imp.ext.sharedPublisherId` in the oRTB request |
| video | Optional | Object | oRTB video parameters (e.g. `mimes`, `w`, `h`, `playbackmethod`) |

# Test Parameters
```
var adUnits = [{
    code: 'banner-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250], [320, 90]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'forbes_main',
           floor: 1.009,
           sharedPublisherId: 'pub_12345'
        }
    }]
}, {
    code: 'banner-div-2',
    mediaTypes: {
        banner: {
            sizes: [[300, 300]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'foodgawker',
           floor: 0.00,
           sharedPublisherId: 'pub_67890'
        }
    }]
}, {
    code: 'banner-div-3',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'forbes_main',
           floor: 0
        }
    }]
}, {
    code: 'instream-div-1',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'instream',
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
            inventoryCode: 'instream_test',
            video: {
                mimes: ['video/mp4'],
                w: 640,
                h: 480,
          },
        }
    }]
}, {
    code: 'native-div-1',
    mediaTypes: {
        native: {
            ortb: {
                assets: [{
                    id: 1,
                    required: 1,
                    img: { type: 3, w: 300, h: 250 }
                }, {
                    id: 2,
                    required: 1,
                    title: { len: 80 }
                }, {
                    id: 3,
                    required: 1,
                    data: { type: 1 }
                }]
            }
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
            inventoryCode: 'native_test'
        }
    }]
}];
```
