/**
 * KlimaOslo Kart – Embed Script
 *
 * Bruk:
 *   <div class="klimaoslo-kart" data-slug="gjenbruk"></div>
 *   <script src="https://kart.klimaoslo.no/embed.js" defer></script>
 *
 * Valgfrie data-attributter:
 *   data-sokefelt="0"  – Skjul søkefelt
 *   data-filter="0"    – Skjul kategorifilter
 *   data-sidebar="0"   – Skjul sidebar
 *   data-height="600"  – Fast høyde i px (overstyrer auto-resize)
 */
;(function () {
  var WIDGET_BASE = 'https://kart.klimaoslo.no'

  function init() {
    var containers = document.querySelectorAll('.klimaoslo-kart[data-slug]')

    for (var i = 0; i < containers.length; i++) {
      createEmbed(containers[i])
    }

    window.addEventListener('message', handleMessage)
  }

  function createEmbed(container) {
    // Unngå dobbel-initialisering
    if (container.querySelector('iframe')) return

    var slug = container.getAttribute('data-slug')
    if (!slug) return

    // Bygg URL med embed-parametre
    var params = []
    if (container.getAttribute('data-sokefelt') === '0') params.push('sokefelt=0')
    if (container.getAttribute('data-filter') === '0') params.push('filter=0')
    if (container.getAttribute('data-sidebar') === '0') params.push('sidebar=0')

    var src = WIDGET_BASE + '/' + encodeURIComponent(slug)
    if (params.length) src += '?' + params.join('&')

    var iframe = document.createElement('iframe')
    iframe.src = src
    iframe.style.width = '100%'
    iframe.style.border = 'none'
    iframe.style.display = 'block'
    iframe.style.minHeight = '400px'
    iframe.setAttribute('loading', 'lazy')
    iframe.setAttribute('allow', 'geolocation')
    iframe.setAttribute('title', 'KlimaOslo Kart – ' + slug)

    // Fast høyde eller auto-resize
    var fixedHeight = container.getAttribute('data-height')
    if (fixedHeight) {
      iframe.style.height = fixedHeight + 'px'
    } else {
      iframe.style.height = '600px' // Standard til auto-resize tar over
    }

    container.appendChild(iframe)
  }

  function handleMessage(event) {
    // Bare aksepter meldinger fra widget-domenet
    if (event.origin !== WIDGET_BASE) return
    if (!event.data || event.data.type !== 'klimaoslo-kart-resize') return

    var iframes = document.querySelectorAll('.klimaoslo-kart iframe')
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        // Ikke overstyr fast høyde
        var container = iframes[i].parentElement
        if (!container.getAttribute('data-height')) {
          iframes[i].style.height = event.data.height + 'px'
        }
        break
      }
    }
  }

  // Start når DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
