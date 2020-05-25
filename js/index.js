(() => {
    let selectedLibrary = document.querySelector("#library")
    let idOrISBNInserted = document.querySelector("#isbnOrId")
    let QualityText = document.querySelector("#QualityNumberText")
    let qualityPDF = document.querySelector("#myRangeQuality")
    let intervalPages = document.querySelector("#intervalPages")
    const buttonToStarProcess = document.querySelector("#startButton")
    let spanErrorValidationFields = document.querySelector("#error")
    const regexISBNDorId = /^\d+(,\d+)*$/
    const regexIntervalPages = /^\d+(,\d+)*$|^\d+(-\d+)$|^\s*$/

    buttonToStarProcess.addEventListener('click', validationFieldsFormat)
    qualityPDF.addEventListener('mousemove', atualizationOnInterfaceQualityPDFvalue)

    function validationFieldsFormat() {

        if (regexISBNDorId.test(idOrISBNInserted.value) && regexIntervalPages.test(intervalPages.value)) {
            ValidationAndOrganizeNumberPagesAndBooks(intervalPages.value)
        } else {
            spanErrorValidationFields.innerText = "Verifique o código do livro ou a numeração das páginas, não são aceitos valores ou formatação diferentes do especificado. Casa hajam espaços, remova-os"
        }
    }

    function ValidationAndOrganizeNumberPagesAndBooks(pages) {
        let BooksTrated = []
        BooksTrated = idOrISBNInserted.value.split(",")
        let pagesNumbersTrated = []

        if (pages == "") {
            sendProcessToBackgroundScript(selectedLibrary.value, BooksTrated, qualityPDF.value)
        } else if (pages.indexOf("-")!=-1) {
            let initNumber = Number(pages.slice(0, pages.indexOf("-")))
            let finalNumber = Number(pages.slice(pages.lastIndexOf("-") + 1, ))
            if (initNumber > finalNumber) {
                spanErrorValidationFields.innerText = "O intervalo de páginas é inválido, o segundo valor não pode ser menor que o primeiro"
            } else {
                for (; initNumber <= finalNumber; initNumber++) {
                    pagesNumbersTrated.push(initNumber)
                }
                sendProcessToBackgroundScript(selectedLibrary.value, BooksTrated, qualityPDF.value, pagesNumbersTrated)
            }
        } else if(pages.indexOf(",")!=-1){
            console.log("entrou aqui")
            pagesNumbersTrated = pages.split(",").map(Number)
            sendProcessToBackgroundScript(selectedLibrary.value, BooksTrated, qualityPDF.value, pagesNumbersTrated)

            
        }

    }

    //I'm sending the data first to the Background Script instead of the contentscript (where the main functions will run). More details of the reason for this are in the backgroundScript comment

    function sendProcessToBackgroundScript(library, books, quality, pages = "fullPages") {
        chrome.runtime.sendMessage({
            library: library,
            books: books,
            quality: Number(quality),
            pages: pages
        })

        openTabToWorkInDownloadProcess(library)

    }

    function openTabToWorkInDownloadProcess(library){
        let linkToOpenInNewTab
        if(library=="VirtualSource"){
            linkToOpenInNewTab = "https://jigsaw.vitalsource.com/"
        }
        else if(library=="PearsonBvirtual"){
            linkToOpenInNewTab = "https://plataforma.bvirtual.com.br/"
        }

        chrome.tabs.create({
            url: linkToOpenInNewTab
        })
      
    }
    function atualizationOnInterfaceQualityPDFvalue() {
        QualityText.innerText = `Qualidade do PDF: ${qualityPDF.value}`
    }
})()