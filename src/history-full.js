let api

htmx.defineExtension('history-full', {
  init: function(internalApi) {
    api = internalApi
  },

  onEvent: function(name, evt) {
    if (name === 'htmx:historyCacheMissLoad') {
      const xhr = evt.detail.xhr
      const swapSpec = evt.detail.swapSpec

      // Handle HX-Location (AJAX redirect)
      const locationHeader = xhr.getResponseHeader('HX-Location')
      if (locationHeader) {
        let redirectPath = locationHeader
        let redirectSwapSpec
        if (redirectPath.indexOf('{') === 0) {
          redirectSwapSpec = JSON.parse(redirectPath)
          redirectPath = redirectSwapSpec.path
          delete redirectSwapSpec.path
        }
        evt.detail.path = redirectPath
        htmx.ajax('get', redirectPath, redirectSwapSpec).then(function() {
          pushUrlIntoHistory(redirectPath)
        })
        swapSpec.swapStyle = 'none'
        return
      }

      // Handle HX-Redirect (full page redirect)
      const redirectUrl = xhr.getResponseHeader('HX-Redirect')
      if (redirectUrl) {
        window.location.href = redirectUrl
        swapSpec.swapStyle = 'none'
        return
      }

      // Handle refresh
      if (xhr.getResponseHeader('HX-Refresh') === 'true') {
        window.location.reload()
        swapSpec.swapStyle = 'none'
        return
      }

      // Handle HX-Reswap
      const reswapHeader = xhr.getResponseHeader('HX-Reswap')
      if (reswapHeader) {
        swapSpec.swapStyle = reswapHeader
      }

      // Handle HX-Retarget
      const retargetHeader = xhr.getResponseHeader('HX-Retarget')
      if (retargetHeader) {
        if (retargetHeader !== 'this') {
          const newTarget = htmx.find(retargetHeader)
          if (newTarget) {
            evt.detail.historyElt = newTarget
          }
        }
      }

      // Handle HX-Reselect
      const reselectHeader = xhr.getResponseHeader('HX-Reselect')
      if (reselectHeader) {
        const fragment = api.makeFragment(evt.detail.response)
        const selectedElement = fragment.querySelector(reselectHeader)
        if (selectedElement) {
          evt.detail.response = selectedElement.outerHTML
        }
      }

      // Handle triggers (let normal swap proceed)
      const triggerHeader = xhr.getResponseHeader('HX-Trigger')
      if (triggerHeader) {
        handleTriggerHeader(xhr, 'HX-Trigger', document.body)
      }

      const triggerAfterSwap = xhr.getResponseHeader('HX-Trigger-After-Swap')
      if (triggerAfterSwap) {
        setTimeout(() => handleTriggerHeader(xhr, 'HX-Trigger-After-Swap', document.body), swapSpec.swapDelay)
      }

      const triggerAfterSettle = xhr.getResponseHeader('HX-Trigger-After-Settle')
      if (triggerAfterSettle) {
        setTimeout(() => handleTriggerHeader(xhr, 'HX-Trigger-After-Settle', document.body), swapSpec.swapDelay + swapSpec.settleDelay)
      }
    }
  }

})

function handleTriggerHeader(xhr, header, elt) {
  const triggerBody = xhr.getResponseHeader(header)
  if (triggerBody.indexOf('{') === 0) {
    const triggers = JSON.parse(triggerBody)
    for (const eventName in triggers) {
      if (triggers.hasOwnProperty(eventName)) {
        let detail = triggers[eventName]
        if (typeof detail === 'object' && detail !== null) {
          elt = detail.target !== undefined ? detail.target : elt
        } else {
          detail = { value: detail }
        }
        htmx.trigger(elt, eventName, detail)
      }
    }
  } else {
    const eventNames = triggerBody.split(',')
    for (let i = 0; i < eventNames.length; i++) {
      htmx.trigger(elt, eventNames[i].trim(), {})
    }
  }
}

function pushUrlIntoHistory(path) {
  // remove the cache buster parameter, if any
  if (htmx.config.getCacheBusterParam) {
    path = path.replace(/org\.htmx\.cache-buster=[^&]*&?/, '')
    if (path.endsWith('&') || path.endsWith('?')) {
      path = path.slice(0, -1)
    }
  }
  if (htmx.config.historyEnabled) {
    history.pushState({ htmx: true }, '', path)
  }
  if (api.canAccessLocalStorage()) {
    sessionStorage.setItem('htmx-current-path-for-history', path)
  }
}
