'use strict';
var cacheStorageKey = 'PhiSim';



const CORE = [
    "/"
];

self.db = {
    read: (key, config) => {
        if (!config) { config = { type: "text" } }
        return new Promise((resolve, reject) => {
            caches.match(new Request(`https://LOCALCACHE/${encodeURIComponent(key)}`)).then(function (res) {
                res.text().then(text => resolve(text))
            }).catch(() => {
                resolve(null)
            })
        })
    },
    write: (key, value) => {
        return new Promise((resolve, reject) => {
            caches.open("PhiSwDB").then(function (cache) {
                cache.put(new Request(`https://LOCALCACHE/${encodeURIComponent(key)}`), new Response(value));
                resolve()
            }).catch(() => {
                reject()
            })
        })
    }
}

function addcache()
{
	caches.open(cacheStorageKey).then(function(cache) {
		return cache.addAll(CORE);
    });
	self.skipWaiting();
}
self.addEventListener('install',e =>{
    e.waitUntil(addcache());
});
self.addEventListener('fetch',async function(e){
  const url=e.request.url.replace(/\?.*$/g,"");
  if(url.endsWith("zip")){
    //chart
    e.respondWith(caches.open("PhiSim-Charts")
      .then((cache) =>  {
        return cache.match(e.request).then((response) => {
          return response || fetch(e.request).then((response) => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
      })
    );
  } else if(url.indexOf("/api/multi")>-1) {
    return;
  } else if(url.startsWith("http")) {
    e.respondWith(caches.open("PhiSim")
      .then((cache) =>  {
        return cache.match(e.request).then((response) => {
          return response || fetch(e.request).then((response) => {
            cache.put(e.request, response.clone());
            return response;
          });
        })
      })
    );
  } else {
      return;
  }
})
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheNames => {
          return (cacheNames !== cacheStorageKey)
        }).map(cacheNames => {
          return caches.delete(cacheNames)
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})