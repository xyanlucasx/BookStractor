(() => {

    let arrayOfBooks
    let qualityPDF
    let positionArrayOfBooks = 0
    let pagesToDownload
    let linkPages = []
    let headInterfacetab
    let bodyInterfaceBody
    let atualpositionInLinkPagesArray = 0
    let invalidsISBNlist = []
    let noAcessISBNlist = []
    let titleAtualBook
    let textToWriteJSPDFcode
    let stopProcessC = 0
    let tryConnectionProblemIframe = 0
    let bookWidth = 0
    let bookHeight = 0
    let library 


    const createInterface = BooksInOrder => {
        headInterfacetab.innerHTML = `<link rel="stylesheet" href="${chrome.runtime.getURL("assets/styleTab.css")}">`
        bodyInterfaceBody.innerHTML = `<div id="TextExplanation"></div> <br> <div id="divIframeatualPageProgress"> </div> <br> <div id="iFrameErrorPages"> </div> <br> <div id="divActions"><input type="button" id="stopButton" value="Pausar processo"> <input type="button" id="downloadButton" value="Baixar até aqui"></div>`
        document.querySelector("#downloadButton").disabled = true
        document.querySelector("#stopButton").addEventListener('click', stopProcess)
        document.querySelector("#downloadButton").addEventListener('click', downloadUltilHere)
        document.querySelector("#popup-signin") ? error401AccountDisloged(createInterface, BooksInOrder) : getJSONPagesInAPIVT(BooksInOrder)
    }

/*
|--------------------------------------------------
| Capturing books and pages from VitalSource
|--------------------------------------------------
*/

    const getJSONPagesInAPIVT = async BooksInOrder => {
        console.log(BooksInOrder, "pegou livro")
        if (positionArrayOfBooks < arrayOfBooks.length) {
            try {
                let resolve = await fetch(`https://jigsaw.vitalsource.com/api/v0/books/${BooksInOrder}/pages`)
                let resolveJson = resolve.status === 200 ? await resolve.json() : resolve.status
                resolveJson.length ? organizeJSONpagesVT(resolveJson) : filterError(getJSONPagesInAPIVT, BooksInOrder, resolveJson)
            } catch {
                conectionProblems(getJSONPagesInAPIVT, BooksInOrder)
            }
        } else {
            console.log("cabou")
            document.title = "Fim"
        }
    }

    const organizeJSONpagesVT = LinkPagesInJson => {
        titleAtualBook = LinkPagesInJson[0].chapterTitle
        linkPages = LinkPagesInJson.filter((value, index) => pagesToDownload.indexOf(index + 1) != -1 || pagesToDownload === "fullPages").map(value => `https://jigsaw.vitalsource.com${value.absoluteURL.slice(0,value.absoluteURL.indexOf("/content"))}`)
        openIframePagesVT()
    }

    const openIframePagesVT = () => {
        document.querySelector("#stopButton").disabled = false
        document.querySelector("#downloadButton").disabled = true

        if (stopProcessC == 1) {
            returnStopProcess(openIframePagesVT)
            return
        }

        if (atualpositionInLinkPagesArray < linkPages.length) {
            bodyInterfaceBody.querySelector("#TextExplanation").innerHTML = `<h1>Livro atual: ${titleAtualBook}. Total de páginas: ${linkPages.length}. Paginas já processadas: ${atualpositionInLinkPagesArray+1}<br><h1> Livro ${positionArrayOfBooks+1} de ${arrayOfBooks.length}</h1> </h1> </div>`
            bodyInterfaceBody.querySelector("#divIframeatualPageProgress").innerHTML = `<iframe id ="iFrameAtualProgress" src="${linkPages[atualpositionInLinkPagesArray]}" width="200" height="200" allowfullscreen></iframe>`
            verifyErrorIframePageVT(linkPages[atualpositionInLinkPagesArray])
        } else {
            atualpositionInLinkPagesArray = 0
            linkPages = []
            downloadPDF()
        }
    }

    const verifyErrorIframePageVT = LinkIframe => {
        let countTryReset = 0
        let timerLoadIframe = setInterval(() => {
            try {
                let loadedIframe = document.querySelector("#iFrameAtualProgress").contentDocument.body.querySelector("#epub-container #epub-content").contentDocument.body.querySelector("#pbk-page").src
                if (loadedIframe) {
                    tryConnectionProblemIframe = 0
                    console.log("achou")
                    clearInterval(timerLoadIframe)
                    let urlTratedJPEGimagePage = loadedIframe.slice(0, loadedIframe.indexOf("encrypted")) + 'encrypted/1600'
                    console.log("Enviou o link para pegar o Blob ", urlTratedJPEGimagePage)
                    getBlobImage(urlTratedJPEGimagePage)
                } else if (document.querySelector("#iFrameAtualProgress").contentDocument.body.querySelector("#popup-signin")) {
                    tryConnectionProblemIframe = 0
                    console.log("Errou, ta deslogado")
                    clearInterval(timerLoadIframe)
                    error401AccountDisloged(openIframePagesVT)
                }
            } catch (errorType) {
                countTryReset++
                console.log("Procurando iFrame ", errorType)
                if (countTryReset > 50) {
                    tryConnectionProblemIframe++

                    if (tryConnectionProblemIframe >= 3) {

                        tryConnectionProblemIframe = 0
                        fetch(LinkIframe)
                            .then(resolve => console.log("entrou por alguma falha"))
                            .catch(reject => {
                                clearInterval(timerLoadIframe)
                                conectionProblems(openIframePagesVT)
                            })
                        return

                    }

                    console.log("Não pegou nem o primeiro Iframe, mesmo depois de tantas tentativas, acionando correção de erro")
                    clearInterval(timerLoadIframe)
                    correctionForIframeErrors(document.querySelector("#iFrameAtualProgress"), countTryReset, LinkIframe)
                }
            }

        }, 100);
    }

/*
|--------------------------------------------------
| General functions to prepare and generate PDF from the pages captured
|--------------------------------------------------
*/

    const getBlobImage = async (LinkImageJPEGpage) => {
        console.log("vai dar um fetch pra pegar a imagem e gerar o codigo pdf")
        console.log(LinkImageJPEGpage)
        try {
            let resolve = await fetch(LinkImageJPEGpage)
            let blobresolve = resolve.status === 200 ? await resolve.blob() : resolve.status
            blobresolve.size ? getBase64Image(blobresolve, LinkImageJPEGpage) : filterError(getBlobImage, LinkImageJPEGpage, blobresolve)
        } catch {
            conectionProblems(getBlobImage, LinkImageJPEGpage)
        }
    }

    const getBase64Image = (blobresolve, LinkImageJPEGpage) => {
        //sometimes(rarely) image with 1600px not exist in server, returning blank image. This code solve this, correction continues in line 153 resizing image.
        if (blobresolve.size === 0) {
            getBlobImage(LinkImageJPEGpage.slice(0, LinkImageJPEGpage.indexOf("encrypted")) + 'encrypted/2000')
            return
        }
        console.log("salvando b64 e colocando no código do PDF")
        console.log(blobresolve)
        const img = new Image();
        img.onload = function () {
            if (LinkImageJPEGpage.indexOf("encrypted/2000") != -1) {
                img.width *= 0.8
                img.height *= 0.8
            }
            if(img.width!== bookWidth && bookWidth !== 0 && img.height!== bookHeight && bookHeight!==0){
                console.log("tamanho difere do inicial")
                let conversionFactorW = img.width / bookWidth
                let conversionFactorH = img.height / bookHeight
                img.width/=conversionFactorW
                img.height/=conversionFactorH
            }
            console.log(img.width, img.height)
            const elem = document.createElement('canvas');
            elem.width = img.width;
            elem.height = img.height;
            const ctx = elem.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            ctx.canvas.toBlob((blobCompress) => {
                const reader = new FileReader
                reader.onload = function () {
                    generateJSPDFcode(reader.result, img.width, img.height)
                }
                reader.readAsDataURL(blobCompress)
            }, 'image/jpeg', qualityPDF);
        }
        img.src = URL.createObjectURL(blobresolve)
    }

    const generateJSPDFcode = (base64JpegImage, width, height) => {
        console.log("reader foi")
        if (atualpositionInLinkPagesArray == 0) {
            bookWidth = Number(width)
            bookHeight = Number(height)
            textToWriteJSPDFcode = ""
            const orientationPage = width > height ? "l" : "p"
            createStrincCode(`let doc = new jsPDF('${orientationPage}', 'px', [${width}, ${height}]);doc.addImage("${base64JpegImage}", 'jpeg', 0, 0, ${width*0.75},${height*0.75});doc.addPage();`)
        } else if (atualpositionInLinkPagesArray == linkPages.length - 1) {
            bookWidth = 0
            bookHeight = 0
            createStrincCode(`doc.addImage("${base64JpegImage}", 'jpeg', 0, 0, ${width*0.75},${height*0.75});doc.save('${titleAtualBook}.pdf');`)
        } else {
            createStrincCode(`doc.addImage("${base64JpegImage}", 'jpeg', 0, 0, ${width*0.75},${height*0.75});doc.addPage();`)
        }
    }

    const createStrincCode = (StringCode) =>{
        console.log("gerando o código PDF com b64")
        textToWriteJSPDFcode += StringCode
        document.title = `L: ${positionArrayOfBooks+1} P: ${atualpositionInLinkPagesArray+1} de ${linkPages.length}`
        atualpositionInLinkPagesArray++
        if(library==="VirtualSource"){
        openIframePagesVT()
        }
    }

    const downloadPDF = () => {
        if (textToWriteJSPDFcode == undefined) {
            window.alert("Nenhuma das páginas inseridas é válida")
        } else {
            console.log("vai baixar agora")
            eval(textToWriteJSPDFcode)
        }
        nextBook()
    }

    const nextBook = () => {
        positionArrayOfBooks++
        if(library==="VirtualSource"){
        getJSONPagesInAPIVT(arrayOfBooks[positionArrayOfBooks])}
    }

/*
|--------------------------------------------------
|                                                               VITALSOURCE ERROR HANDLER
| Functions to correct disconnection, captcha and sign out errors. Errors are sent here, corrected and the function that generated the error is
| returned to execute and continue the process
|--------------------------------------------------
*/

    const filterError = (functionThatCalled, necessaryData, error) => {

        console.log(error)
        if (error === 401) {
            console.log(error, 'Deslogado')
            error401AccountDisloged(functionThatCalled, necessaryData)
        } else if (error === 403) {
            console.log(error, 'Sem acesso')
            noAcessISBNlist.push(necessaryData)
            positionArrayOfBooks++
            getJSONPagesInAPIVT(arrayOfBooks[positionArrayOfBooks])
        } else if (error === 404) {
            console.log(error, 'ISBN inválido')
            invalidsISBNlist.push(necessaryData)
            positionArrayOfBooks++
            getJSONPagesInAPIVT(arrayOfBooks[positionArrayOfBooks])
        } else if (error === 428) {
            console.log("Captcha necessário")
            error428CaptchaRequired(functionThatCalled, necessaryData, arrayOfBooks[positionArrayOfBooks])
        } else {
            console.log("Erro desconhecido:", error)
            conectionProblems(functionThatCalled, necessaryData)
        }
    }

    const correctionForIframeErrors = (iFrameAtt, resetCount, necessaryData) => {
        resetCount = 0
        if(iFrameAtt.contentDocument.querySelector("#popup-signin")){
            error401AccountDisloged(openIframePagesVT)
            return
        }
        iFrameAtt.src = iFrameAtt.src
        console.log("Iframe foi atualizado para ver se o erro é corrigido", iFrameAtt)
        verifyErrorIframePageVT(necessaryData)
    }

    const error401AccountDisloged = (functionThatCalled, necessaryData) => {
        console.log("entrou")
        let myAudio = new Audio(chrome.runtime.getURL("assets/alerta.mp3"));
        myAudio.play();
        document.title = "DESLOGADO!"

        console.log("entrou no iframe erro 401")
        bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = `<div id="divIframeError"><iframe id="iFrameError" scrolling="no" src = "https://jigsaw.vitalsource.com/login?return=%2Fapi%2Fv0%2Fbooks%2F3%2Fpages"></iframe></div><input id="buttonReturnIfFailedSetTimeout" type="button" value="Clique aqui se o processo não retornar após o login">`

        setTimeout(() => {
            let buttonToSendAction401 = document.querySelector("#iFrameError").contentDocument.body.querySelector("body > div:nth-child(3) > form > div:nth-child(11) > input") || document.querySelector("#buttonReturnIfFailedSetTimeout")
            buttonToSendAction401.addEventListener("click", returnedToFunctionThatErrorOcurred)

            function returnedToFunctionThatErrorOcurred() {
                setTimeout(() => {
                    bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = ""
                    functionThatCalled(necessaryData)
                }, 1000);
            }
        }, 3000);
    }

    const error428CaptchaRequired = (functionThatCalled, necessaryData, BookID) => {

        let myAudio = new Audio(chrome.runtime.getURL("assets/alerta.mp3"));
        myAudio.play();
        document.title = "CAPTCHA!"

        bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = `<div id="divIframeError"><iframe id="iFrameError" scrolling="no" src = "https://jigsaw.vitalsource.com/books/${BookID}/cfi/2!/4/2@100:0.00?jigsaw_brand=cengageLearningEditoresSaDeCvBrasil&dps_on=false&xdm_e=https%3A%2F%2Fcengagebrasil.vitalsource.com&xdm_c=default3199&xdm_p=1"></iframe></div><input id="buttonReturnIfFailedSetTimeout" type="button" value="Clique aqui se o processo não retornar após o captcha">`

        document.querySelector("#buttonReturnIfFailedSetTimeout").addEventListener("click", returnedToFunctionThatErrorOcurred)
        const loadFristI = setInterval(() => {
            try {
                if (document.querySelector("#iFrameError").contentDocument.body.querySelector("#epub-content").contentDocument.body.querySelector("#recaptcha").contentDocument.body.querySelector("#content > form > input[type=submit]:nth-child(6)")) {
                    clearInterval(loadFristI)
                    console.log("Achou o botão de submit")
                    document.querySelector("#iFrameError").contentDocument.body.querySelector("#epub-content").contentDocument.body.querySelector("#recaptcha").contentDocument.body.querySelector("#content > form > input[type=submit]:nth-child(6)").addEventListener("click", returnedToFunctionThatErrorOcurred)
                }
            } catch {

            }

        }, 100);


        function returnedToFunctionThatErrorOcurred() {
            setTimeout(() => {
                bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = ""
                functionThatCalled(necessaryData)
            }, 1500);
        }
    }

    const conectionProblems = (functionThatCalled, necessaryData) =>{
        document.title = "Problema de conexão"
        bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = `<h1> Houve algum erro inesperado, verifique sua conexão e clique no botão abaixo para retornar o processo de onde parou. Caso prefira você pode baixar o que já tem até aqui normalmente</h1><br><input type="button" id="buttonReturn" value="Retornar">`
        document.querySelector("#stopButton").disabled = true
        document.querySelector("#stopButton").value = "Pausar processo"
        document.querySelector("#downloadButton").disabled = false
        document.querySelector("#buttonReturn").addEventListener('click', function () {
            bodyInterfaceBody.querySelector("#iFrameErrorPages").innerHTML = ""
            functionThatCalled(necessaryData)
        })
    }

/*
|--------------------------------------------------
| Functions related with other part of extenson. Example: Buttons to Stop and Download
|--------------------------------------------------
*/

    const stopProcess = () => {

        stopProcessC = 1
        document.querySelector("#stopButton").value = "Aguarde..."
        document.querySelector("#stopButton").disabled = true
    }

    const returnStopProcess = callBack => {
        stopButton.value = "Retornar processo"
        document.querySelector("#downloadButton").disabled = false
        document.querySelector("#stopButton").disabled = false
        document.querySelector("#stopButton").value = "Retornar processo"
        document.querySelector("#stopButton").addEventListener("click", function returnState() {

            document.querySelector("#stopButton").disabled = true
            document.querySelector("#downloadButton").disabled = true
            document.querySelector("#stopButton").value = "Pausar processo"
            stopProcessC = 0
            callBack()
            document.querySelector("#stopButton").removeEventListener("click", returnState)
        })
    }

    const downloadUltilHere = () => {
        try {
            document.querySelector("#downloadButton").disabled = true
            let interruptTextToWriteJSPDFcode = textToWriteJSPDFcode.slice(0, -14) + `doc.save('${titleAtualBook}.pdf');`
            eval(interruptTextToWriteJSPDFcode)
            stopProcessC = 0
        } catch {
            window.alert("Aguarde mais algumas páginas antes de tentar isso")
        }
    }


/*
|--------------------------------------------------
|                                                       END
|--------------------------------------------------
*/

    chrome.runtime.onMessage.addListener(request => {
            if (request.library == "VirtualSource") {

                arrayOfBooks = request.books
                qualityPDF = request.quality
                pagesToDownload = request.pages
                headInterfacetab = document.querySelector("head")
                bodyInterfaceBody = document.querySelector("body")
                library = "VirtualSource"
                createInterface(arrayOfBooks[positionArrayOfBooks])

            } else if (request.library == "PearsonBvirtual") {
                window.alert("Serviço ainda em produção")
            }
        })

})()