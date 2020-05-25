//I sent the data here first, as it is necessary to wait a few seconds for the new tab open in Popup to be ready to receive the data sent, but the popup is closed after the opening of the new tab, not being able to send there. Therefore, sending the data here and waiting 2 seconds to communicate with the new tab is the best solution.

chrome.runtime.onMessage.addListener(
    function (request) {
        let library = request.library
        let books = request.books
        let quality = request.quality
        let pages = request.pages
        let ulrOpened

        if (library == "VirtualSource") {
            ulrOpened = "https://jigsaw.vitalsource.com/*"
            sendToCorrectTab(ulrOpened)
        } else if (library == "PearsonBvirtual") {
            ulrOpened = "https://plataforma.bvirtual.com.br/*"
            sendToCorrectTab(ulrOpened)
        }

        function sendToCorrectTab(ulrOpened) {
            console.log(library, books, quality, pages, ulrOpened)
            setTimeout(() => {
                chrome.tabs.query({
                    url: ulrOpened
                }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        library: library,
                        books: books,
                        quality: quality,
                        pages: pages
                    })
                })

            }, 2000)
        }
    })