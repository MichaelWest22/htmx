htmx.defineExtension('hold', {
  onEvent: function(name, evt) {
    if (name === 'htmx:afterProcessNode') {
      const elt = evt.detail.elt
      const triggerSpec = elt.getAttribute('hx-trigger') || elt.getAttribute('data-hx-trigger')
      if (triggerSpec && triggerSpec.includes('hold') && triggerSpec.includes('delay:')) {
        if (elt._holdSetup) return
        elt._holdSetup = true

        const startHold = (e) => {
          e.preventDefault()
          htmx.trigger(elt, 'hold')
        }

        const cancelHold = () => {
          const internalData = elt['htmx-internal-data']
          if (internalData && internalData.delayed) {
            clearTimeout(internalData.delayed)
            internalData.delayed = null
          }
        }

        elt.addEventListener('mousedown', startHold)
        elt.addEventListener('touchstart', startHold)
        elt.addEventListener('mouseup', cancelHold)
        elt.addEventListener('mouseleave', cancelHold)
        elt.addEventListener('touchend', cancelHold)
        elt.addEventListener('touchcancel', cancelHold)
      }
    }
    return true
  }
})
