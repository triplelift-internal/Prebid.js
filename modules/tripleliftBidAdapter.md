# Overview

```
Module Name:  Triplelift Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@triplelift.com
```

# Description

Connects to Triplelift Exchange for bids.
Triplelift bid adapter supports Banner format only.

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
           parentId: 'forbes_main_parent',
           publisherId: 'forbes_main_publisher',
           floor: 1.009
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
           inventoryCode: 'foodgawker',,
           parentId: 'foodgawker_parent',
           publisherId: 'foodgawker_publisher',
           floor: 0.00
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
           parentId: 'forbes_main_parent',
           publisherId: 'forbes_main_publisher',
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
            parentId: 'instream_parent',
            publisherId: 'instream_publisher',
            video: {
                mimes: ['video/mp4'],
                w: 640,
                h: 480,
          },
        }
    }]
}];
```
