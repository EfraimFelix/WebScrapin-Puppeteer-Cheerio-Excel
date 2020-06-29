const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const readline = require("readline");
const excel = require('excel4node');
// (\()?\d{3}(?(1)\))[-. ]?\d{3}[-. ]?\d{4}
// (\()?\d{2}(?(1)\))[-. ]?\d{4}[-. ]?\d{4}
(async () => {

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function finish(browser, success) {
        console.log('Busca finalizada!')
        if (success) {
            console.log("Procure em meus arquivos por \"Resultado_Pesquisa.xlsx\"");
        }
        await browser.close()
        return
    }

    console.log("\nIniciando a busca!\n")

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (str) => new Promise(resolve => rl.question(str, resolve));

    const browser = await puppeteer.launch({
        headless: true //true se em produção
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1366,
        height: 720
    })

    await page.goto('https://ipatingaimoveis.com.br/');

    try {
        await page.waitFor('#busca_ajax_cidade .options li')
        const cidades = await page.evaluate(() => Array.from(document.querySelectorAll('#busca_ajax_cidade .options li'), (e) => e.getAttribute('data-val')))
        
        console.log('Selecione uma cidade')
        for (let index = 0; index < cidades.length; index++) {
            console.log(`Digite ${index} para selecionar ${cidades[index]}`)
        }
        const cidadeId = await question(`\nDigite um número entre 0 e ${cidades.length - 1}: `)
        const cidade = cidades[cidadeId.trim()]
        console.log("Você selecionou " + cidade + "\n")
        await page.evaluate((cidadeId) => document.querySelectorAll('#busca_ajax_cidade .options li')[cidadeId.trim()].click(), cidadeId);
    } catch (error) {
        console.log(error, "Não foi possivel selecionar a cidade")
        rl.close()
        return
    }

    try {
        await page.waitFor('li')
        await sleep(6000)
        const bairros = await page.evaluate(() => Array.from(document.querySelectorAll('#busca_ajax_bairro .options li'), (e) => e.getAttribute('data-val')))
        
        console.log('Selecione um bairro')
        for (let index = 0; index < bairros.length; index++) {
            console.log(`Digite ${index} para selecionar ${bairros[index]}`)
        }
        const bairroId = await question(`\nDigite um número entre 0 e ${bairros.length - 1}: `)
        const bairro = bairros[bairroId.trim()]
        console.log("Você selecionou " + bairro + "\n")
        await page.evaluate((bairroId) => document.querySelectorAll('#busca_ajax_bairro .options li')[bairroId.trim()].click(), bairroId);
    } catch (error) {
        console.log(error, "Não foi possivel selecionar este bairro")
        rl.close()
        return
    }

    try {
        await page.waitFor('li')
        await sleep(6000)
        const tipos = await page.evaluate(() => Array.from(document.querySelectorAll('#busca_ajax_tiposubtipo .options label'), (e) => e.innerHTML))
        
        console.log('Selecione o tipo')
        for (let index = 0; index < tipos.length; index++) {
            console.log(`Digite ${index} para selecionar ${tipos[index]}`)
        }
        const tipoId = await question(`\nDigite um número entre 0 e ${tipos.length - 1}: `)
        const tipo = tipos[tipoId.trim()]
        console.log("Você selecionou " + tipo + "\n")
        await page.evaluate((tipoId) => document.querySelectorAll('#busca_ajax_tiposubtipo .options li')[tipoId.trim()].click(), tipoId);
    } catch (error) {
        console.log(error, "Não foi possivel selecionar este bairro")
        rl.close()
        return
    }

    await page.waitFor('input#pesquisa_submit')
    await page.click('input#pesquisa_submit')

    let imoveis = []
    let pause = false
    while (!pause) {
        await page.waitForNavigation()
        const nextIsEnable = await page.evaluate(() => document.querySelector('a.next_page') !== null)

        let $ = cheerio.load(await page.content());

        $('.buscar-imovel-resultado').each((i, e) => {
            const tipo = $('.destaque-tipo', e).text().trim();
            const bairro = $('.destaque-bairro', e).text().trim();
            const valor = $('.destaque-valores', e).text().replace('Venda R$ ', '').trim();
            const dormitorios = $('.destaque-dormitorios', e).text().trim();
            const banheiros = $('.destaque-banheiros', e).text().trim();
            const vagas = $('.destaque-vagas', e).text().trim();
            const area = $('.destaque-area', e).text().trim();
            const href = $('.destaque-detalhes', e).children().first().attr('href');

            const hrefParts = href.split('/');
            const id = hrefParts[hrefParts.length - 1].replace('id-', '').replace('.html', '');
            imoveis.push({
                id,
                tipo,
                bairro,
                valor,
                dormitorios,
                banheiros,
                vagas,
                area
            })
        });

        if (nextIsEnable) {
            await page.click('a.next_page')
        } else {
            pause = !nextIsEnable
        }

    }


    const workbook = new excel.Workbook();

    const worksheet = workbook.addWorksheet('Sheet 1');

    const color = ['#FF0000', '#00008B']

    worksheet.cell(1, 1).string('Id')
    worksheet.cell(1, 2).string('Tipo')
    worksheet.cell(1, 3).string('Bairro')
    worksheet.cell(1, 4).string('Valor')
    worksheet.cell(1, 5).string('Dormitorios')
    worksheet.cell(1, 6).string('Banheiros')
    worksheet.cell(1, 7).string('Vagas')
    worksheet.cell(1, 8).string('Area')

    for (let x = 2; x < imoveis.length; x++) {

        const col = x % 2 == 0 ? 0 : 1
        const font = { font: { color: color[col] } }


        worksheet.cell(x, 1).string(imoveis[x - 2].id).style(workbook.createStyle(font));
        worksheet.cell(x, 2).string(imoveis[x - 2].tipo).style(workbook.createStyle(font));
        worksheet.cell(x, 3).string(imoveis[x - 2].bairro).style(workbook.createStyle(font));
        worksheet.cell(x, 4).string(imoveis[x - 2].valor).style(workbook.createStyle(font));
        worksheet.cell(x, 5).string(imoveis[x - 2].dormitorios).style(workbook.createStyle(font));
        worksheet.cell(x, 6).string(imoveis[x - 2].banheiros).style(workbook.createStyle(font));
        worksheet.cell(x, 7).string(imoveis[x - 2].vagas).style(workbook.createStyle(font));
        worksheet.cell(x, 8).string(imoveis[x - 2].area).style(workbook.createStyle(font));

    }

    workbook.write('../Resultado_Pesquisa.xlsx');
    
    console.log('\nBusca finalizada!\n')
    console.log("Procure nos arquivos por \"Resultado_Pesquisa.xlsx\"");
    rl.close()
    //await browser.close()

})();