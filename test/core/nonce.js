describe('Core CSP Nonce checks', function() {
    const chai = window.chai
    beforeEach(function() {
      this.server = makeServer()
      clearWorkArea()
    })
    afterEach(function() {
      this.server.restore()
      clearWorkArea()
    })
  
    it('inlineScriptNonce sets nonce of script correctly so it can run when CSP nonce set', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', '<script nonce="shouldBeReplaced">console.trace(); window.i++</script>') // increment the count by 1
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(1)
        delete window.i
        done()
      }, 50)
    })
  
    it('inlineScriptNonce not set prevents inline scripts running because it will not match CSP', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', '<script nonce="shouldBeReplaced">console.trace(); window.i++</script>') // fail to increment the count by 1
      htmx.config.inlineScriptNonce = ''
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(0)
        delete window.i
        htmx.config.inlineScriptNonce = 'nonce'
        done()
      }, 50)
    })
  
    it('inlineScriptNonce set wrong prevents inline scripts running because it will not match CSP', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', '<script nonce="shouldBeReplaced">console.trace(); window.i++</script>') // fail to increment the count by 1
      htmx.config.inlineScriptNonce = 'invalid'
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(0)
        delete window.i
        htmx.config.inlineScriptNonce = 'nonce'
        done()
      }, 50)
    })
  
    it('safeInlineScriptNonce set and HX-Nonce header match script nonce allows inline scripts to run', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', [200, { 'HX-Nonce': '6p1zabP/K+va3O8bi2yydg==' }, '<script nonce="6p1zabP/K+va3O8bi2yydg==">console.trace(); window.i++</script>'])
      htmx.config.safeInlineScriptNonce = 'nonce'
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(1)
        delete window.i
        htmx.config.safeInlineScriptNonce = ''
        done()
      }, 50)
    })
  
    it('safeInlineScriptNonce set wrong blocks inline scripts running', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', [200, { 'HX-Nonce': '6p1zabP/K+va3O8bi2yydg==' }, '<script nonce="6p1zabP/K+va3O8bi2yydg==">console.trace(); window.i++</script>'])
      htmx.config.safeInlineScriptNonce = 'invalid'
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(0)
        delete window.i
        htmx.config.safeInlineScriptNonce = ''
        done()
      }, 50)
    })
  
    it('safeInlineScriptNonce set but HX-Nonce header does not match script nonce will block inline scripts', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', [200, { 'HX-Nonce': '6p1zabP/K+va3O8bi2yydg==' }, '<script nonce="invalid">console.trace(); window.i++</script>'])
      htmx.config.safeInlineScriptNonce = 'nonce'
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(0)
        delete window.i
        htmx.config.safeInlineScriptNonce = ''
        done()
      }, 50)
    })
  
    it('safeInlineScriptNonce set but HX-Nonce header not set will block inline scripts', function(done) {
      window.i = 0 // set count to 0
      this.server.respondWith('GET', '/test', [200, {}, '<script nonce="6p1zabP/K+va3O8bi2yydg==">console.trace(); window.i++</script>'])
      htmx.config.safeInlineScriptNonce = 'nonce'
      var div = make('<div hx-get="/test" hx-swap="innerHTML settle:5ms"/>')
      div.click()
      this.server.respond()
  
      setTimeout(function() {
        window.i.should.equal(0)
        delete window.i
        htmx.config.safeInlineScriptNonce = ''
        done()
      }, 50)
    })
  })
  