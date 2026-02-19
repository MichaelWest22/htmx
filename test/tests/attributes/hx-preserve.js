describe('hx-preserve attribute', function() {

    beforeEach(() => {
        setupTest()
    })

    afterEach(() => {
        cleanupTest()
    })

    it('preserves element with hx-preserve during swap', async function () {
        mockResponse('GET', '/test', '<div id="preserved" hx-preserve>Preserved</div><div>New</div>')
        let div = createProcessedHTML('<div hx-get="/test"><div id="preserved" hx-preserve>Original</div></div>');
        div.click()
        await forRequest()
        assertTextContentIs('#preserved', 'Original')
    })

    it('preserves element state during swap', async function () {
        mockResponse('GET', '/test', '<input id="inp" hx-preserve value="new"/>')
        let div = createProcessedHTML('<div hx-get="/test"><input id="inp" hx-preserve value="old"/></div>');
        find('#inp').value = 'modified';
        div.click()
        await forRequest()
        assert.equal(find('#inp').value, 'modified')
    })

    it('handles hx-preserve when element does not exist in current page', async function () {
        mockResponse('GET', '/test', '<div id="new-preserved" hx-preserve>New Preserved</div><div>Content</div>')
        let div = createProcessedHTML('<div hx-get="/test"><div>Original Content</div></div>');
        div.click()
        await forRequest()
        assertTextContentIs('#new-preserved', 'New Preserved')
    })

    it('restores focus and caret to input inside preserved element after swap', async function () {
        mockResponse('GET', '/test', '<div id="widget" hx-preserve><input id="inp" value="hello"/></div>')
        let div = createProcessedHTML('<div hx-get="/test"><div id="widget" hx-preserve><input id="inp" value="hello"/></div></div>')
        let input = find('#inp')
        input.focus()
        input.setSelectionRange(3, 3)
        div.click()
        await forRequest()
        document.activeElement.id.should.equal('inp')
        document.activeElement.selectionStart.should.equal(3)
        document.activeElement.selectionEnd.should.equal(3)
    })

    it('restores focus to preserved element teleported from outside target into swap', async function () {
        mockResponse('GET', '/test', '<div id="widget" hx-preserve><input id="inp" value="hello"/></div>')
        let outer = createProcessedHTML('<div><div id="widget"><input id="inp" value="hello"/></div><div hx-get="/test" id="target"><div>old</div></div></div>')
        let input = find('#inp')
        input.focus()
        input.setSelectionRange(2, 2)
        find('#target').click()
        await forRequest()
        document.activeElement.id.should.equal('inp')
        document.activeElement.selectionStart.should.equal(2)
        document.activeElement.selectionEnd.should.equal(2)
    })
})
