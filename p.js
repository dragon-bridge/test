let defaultLanguage;
let language;
let rows;
let columns;
let resultPrecision;

function loadBoards(board) {
    rows = 1;
    columns = 1;
    var page = 0;
    var boardNumber = 0;
    var row = 0;
    if (boardNumber % (rows * columns) === 0) {
        page++;
        appendHtml("everything",
            `<table id="page${page}"></table>`);
        row = 0;
    }
    if (boardNumber % columns === 0) {
        row++;
        appendHtml(`page${page}`, `<tr id="row_${page}_${row}"></tr>`);
    }
    boardNumber++;
    appendHtml(`row_${page}_${row}`, `<td id="td_${boardNumber}" style="vertical-align: top;"></td>`);
    setBoardContent(`td_${boardNumber}`, board);
}

function setLanguage(lang) {
    if (lang !== null)
        localStorage.setItem('languageTC', lang);
    else {
        var langNow = localStorage.getItem('languageTC');
        if (langNow === "undefined" || langNow === null)
            localStorage.setItem('languageTC', defaultLanguage);
    }
    lang = localStorage.getItem('languageTC');
    $.ajax({
        url: 'language/' + lang + '.json',
        dataType: 'json',
        async: false,
        success: function(file) { language = file }
    });

    $('#nsBS').text(language.nsBS);
    $('#ewBS').text(language.ewBS);
    $('#contractBS').text(language.contractBS);
    $('#declarerBS').text(language.declarerBS);
    $('#leadBS').text(language.leadBS);
    $('#tricksBS').text(language.tricksBS);
    $('#scoreBS').text(language.scoreBS);
    $('#resultBS').text(language.resultBS);
    $('#scoreNsBL').text(language.scoreNsBL);
    $('#scoreEwBL').text(language.scoreEwBL);
    $('#resultNsBL').text(language.resultNsBL);
    $('#resultEwBL').text(language.resultEwBL);
}

function wellDefined(something) {
    if (something === null)
        return false;
    if (something === "")
        return false;
    return true;
}

const declarers = ["N", "S", "W", "E"];

function unveilDeclarer(declarer) {
    if (typeof declarer === 'undefined') {
        return "";
    }
    return declarers[declarer];
}

const colorsNames = ["clubs", "diamonds", "hearts", "spades", "notrump"];

function replaceLettersWithImages(str) {
    str = str.replace("C", '<img class="table-img" src="./img/clubs.gif">');
    str = str.replace("D", '<img class="table-img" src="./img/diamonds.gif">');
    str = str.replace("H", '<img class="table-img" src="./img/hearts.gif">');
    str = str.replace("S", '<img class="table-img" src="./img/spades.gif">');
    str = str.replace("NT", '<img class="table-img" src="./img/notrump.gif">');
    return str;
}

function createBiddingOrPlay(biddingOrPlay) {
    let rows = "";
    biddingOrPlay.forEach(step => {
        let bids = "";
        step.forEach(bid => {
            if (bid === null)
                bid = "";
            if (bid !== "PASS")
                bid = replaceLettersWithImages(bid);
            bids += `<td>${bid}</td>`;
        });
        rows += `<tr>${bids}</tr>`;
    });
    return `<table class="table table-sm"><tr><th>W</th><th>N</th><th>E</th><th>S</th></tr>${rows}</table>`;
}

function unveilContract(contract, bidding) {
    let unveiled;
    let shouldWrap = false;
    let shortened = "ARB";
    switch (contract.__type) {
        case "PointScore:#CalculatingEngine":
            {
                let height = contract.Height;
                if (!contract.WithContract) {
                    unveiled = contract.Score;
                } else if (height === 0) {
                    unveiled = "PASS";
                } else {
                    let colorImg = `<img class="table-img" src="./img/${colorsNames[contract.Denomination]}.gif">`;
                    let doubles = contract.Xx === 0 ? "" : (contract.Xx === 1 ? "X" : "XX");
                    unveiled = height + colorImg + doubles;
                }
                if (bidding.length > 0) {
                    shouldWrap = true;
                    shortened = unveiled;
                    unveiled = createBiddingOrPlay(bidding);
                }
                break;
            }
        case "ArtificialScoreAveragePlus:#CalculatingEngine":
            unveiled = "AP";
            break;
        case "ArtificialScoreAverageMinus:#CalculatingEngine":
            unveiled = "AM";
            break;
        case "ArtificialScoreAverage:#CalculatingEngine":
            unveiled = "AA";
            break;
        case "ArtificialScoreSitOut:#CalculatingEngine":
            unveiled = "SIT-OUT";
            shouldWrap = true;
            break;
        case "WeightedScore:#CalculatingEngine":
            shouldWrap = true;
            unveiled = "";
            $.each(contract._weightingComponents,
                (index, value) => {
                    if (index > 0)
                        unveiled += ";";
                    unveiled += (value._scoreWeightDecimal * 100).toString() + "%";
                    unveiled += unveilContract(value.Score, bidding).contract;
                });
            break;
        case "ScoreSewog:#CalculatingEngine":
            shouldWrap = true;
            unveiled = "BO:" +
                unveilContract(contract.BeforeOffence, bidding).contract +
                "EAO:" +
                unveilContract(contract.ExpectedAfterOffence, bidding).contract +
                "AAO:" +
                unveilContract(contract.ActualAfterOffence, bidding).contract;
            break;
        case "ArtificialAdjustedScore:#CalculatingEngine":
            shouldWrap = true;
            unveiled = "ARB" + contract.Result._pointsDecimal.toString();
            break;
        default:
            unveiled = "ERR";
    }
    return {
        contract: unveiled,
        wrapping: shouldWrap,
        shortened: shortened
    };

}

const figures = ["J", "Q", "K", "A"];

function unveilLead(lead = null) {
    if (lead === null)
        return "";
    let height = lead.CardHeight < 9 ? (lead.CardHeight + 2).toString() : figures[lead.CardHeight - 9];
    let colorImg = `<img class="table-img" src="./img/${colorsNames[lead.CardColor]}.gif">`;
    return colorImg + height;
}

function unveilTricks(tricks, play) {
    let unveiled;
    let shouldWrap = false;
    let shortened = "ARB";

    if (typeof tricks === 'undefined' || tricks === null) {
        return "";
    }
    unveiled = tricks === 0 ? "=" : (tricks > 0 ? "+" + tricks.toString() : tricks.toString());
    if (play.length > 0) {
        shouldWrap = true;
        shortened = unveiled;
        unveiled = createBiddingOrPlay(play);
    }
    return {
        tricks: unveiled,
        wrapping: shouldWrap,
        shortened: shortened
    };
}

const vulnerabilities = ["BB", "AB", "BA", "AA"];
const vulnerabilitiesHuman = ["None", "NS", "EW", "All"];

function setBoardContent(id, board) {

    let boardHtml =
        `<div class="col-12 col-xl leftTab" id="tabB"><div id="contentB"><div class="row boardInfo no-gutters" id="board${
            board}"><div class="col-12">` +
            `<div class="row no-gutters"><div class="col col-auto"><div class="d-flex flex-column h-100 justify-content-between">` +
            `<span class="align-self-center text-center h-50 px-2" id="bTitle${board
            }"></span><span class="align-self-end pr-3" id="wCards${board}"></span>` +
            `<span class="align-self-center text-center h-50"></span></div></div><div class="col"><div class="row"><div class="col" id="nCards${
            board}"></div>` +
            `<div class="col text-right" id="tricksNsSmall${board}"></div></div><div class="row no-gutters">` +
            `<div class="col-auto bImage" id="bImage${board}"></div><div class="col"><div class="d-flex h-100">` +
            `<span class="align-self-center pl-3" id="eCards${board
            }"></span></div></div></div><div class="row"><div class="col" id="sCards${board}"></div>` +
            `<div class="col text-right" id="tricksEwSmall${board
            }"></div></div></div></div></div><div class="d-none d-lg-block col-lg-4">` +
            `<div class="row"><div class="col-12 mb-3"></div></div></div></div><div class="row boardInfo">` +
            `<div class="col text-right" id="miniMaxContainer${board
            }"></div></div>	<div class="row" id="scoresTable"><div class="col">` +
            `<table class="table table-striped table-sm table-bordered"><thead><tr>
								<th rowspan="2" scope="col" class="align-middle text-center" id="nsBS">NS</th>
								<th rowspan="2" scope="col" class="align-middle text-center" id="ewBS">EW</th>
								<th rowspan="2" scope="col" class="align-middle text-center" id="contractBS">Co</th>
								<th rowspan="2" scope="col" class="align-middle text-center" id="declarerBS">De</th>
								<th rowspan="2" scope="col" class="align-middle text-center" id="leadBS">Le</th>
								<th rowspan="2" scope="col" class="align-middle text-center" id="tricksBS">Tr</th>
								<th colspan="2" scope="col" class="align-middle text-center" id="scoreBS">Sc</th>
								<th colspan="2" scope="col" class="align-middle text-center" id="resultBS">Res</th>
							</tr>
							<tr>
								<th scope="col" class="align-middle text-center" id="scoreNsBL">NS</th>
								<th scope="col" class="align-middle text-center" id="scoreEwBL">EW</th>
								<th scope="col" class="align-middle text-center" id="resultNsBL">NS</th>
								<th scope="col" class="align-middle text-center" id="resultEwBL">EW</th>
							</tr>
							</thead>
							<tbody id="sBody${board}">
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>`;

    appendHtml(id, boardHtml);
    setLanguage(null);

    let boardJson = `./d${board}-0.json`;
    let scoresJson = `./sg${board}-0.json`;

    return $.getJSON(scoresJson)
        .done((scores) => {
            let scoresTable = "";
            $.each(scores.Scores,
                (index, value) => {
                    let showDetails = value.IsEwComplementar &&
                        value.NsScore.__type === "PointScore:#CalculatingEngine" &&
                        value.NsScore.Height !== 0;
                    let contract;
                    if (value.IsEwComplementar) {
                        let unveiledContract = unveilContract(value.NsScore, value.Bidding);
                        contract = unveiledContract.wrapping
                            ? wrapTooltip(unveiledContract.contract, unveiledContract.shortened)
                            : unveiledContract.contract;
                    } else {
                        contract = shortenArtificials(unveilContract(value.NsScore, value.Bidding).contract,
                            unveilContract(value.EwScore, value.Bidding).contract);
                    }
                    let tricks = "";
                    if (showDetails) {
                        var t = unveilTricks(value.NsScore.Overtricks, value.Play);
                        tricks = t.wrapping
                            ? wrapTooltip(t.tricks, t.shortened)
                            : t.tricks;
                    }
                    let playerNs = value.ParticipantsNs[0];
                    let playerEw = value.ParticipantsEw[0];
                    scoresTable += `<tr data-participants="|${value.ParticipantsNs[0].Number}|${
                        value.ParticipantsEw[0].Number}|">\n` +
                        `<td class="align-middle text-center clickable">` +
                        `${wrapTooltip(playerNs.Name, playerNs.Number)}</td>\n` +
                        `<td class="align-middle text-center clickable">` +
                        `${wrapTooltip(playerEw.Name, playerEw.Number)}</td>\n` +
                        `<td class="align-middle text-center">${contract}</td>\n` +
                        `<td class="align-middle text-center">${
                        showDetails ? unveilDeclarer(value.NsScore.Declarer) : ""}</td>\n` +
                        `<td class="align-middle text-center">${showDetails ? unveilLead(value.NsScore.Lead) : ""
                        }</td>\n` +
                        `<td class="align-middle text-right">${tricks}</td>\n` +
                        `<td class="align-middle text-right">${
                        showDetails && value.NsScore.Score > 0 ? value.NsScore.Score : ""}</td>\n` +
                        `<td class="align-middle text-right">${
                        showDetails && value.NsScore.Score < 0 ? -1 * value.NsScore.Score : ""}</td>\n` +
                        `<td class="align-middle text-right">${(Math.round(value.NsResult * 10000) / 10000).toFixed(2)
                        }</td>\n` +
                        `<td class="align-middle text-right">${(Math.round(value.EwResult * 10000) / 10000).toFixed(2)
                        }</td>\n` +
                        `</tr>\n`;
                });
            if (scores.NsAverage !== -10000) {
                var datum = scores.NsAverage === -scores.EwAverage
                    ? `${scores.NsAverage}`
                    : `${scores.NsAverage}${-scores.EwAverage}`;
                scoresTable += `<tr>\n<td colspan="6" class="align-middle text-right">${language.datum}:</td>\n` +
                    `<td colspan="2" class="align-middle text-center d-none d-md-table-cell">${datum}</td>\n` +
                    `<td class="align-middle text-center d-md-none">${datum}</td>\n` +
                    `<td colspan="2" class="align-middle text-center"></td>\n</tr>\n`;
            }
            setHtml(`sBody${board}`, scoresTable);
            //activates new tooltips
            $(function () {
                $('.new-tooltip').tooltip();
                $.each($('.new-tooltip'),
                    (index, value) => {
                        value.classList.remove("new-tooltip");
                    });
            });

            $.getJSON(boardJson)
                .done((boardJson) => {
                    let miniMaxHtml = parseMiniMax(`Minimax: ${boardJson._handRecord.MiniMax}`);
                    let eCardsHtml = handDescription(boardJson._handRecord.HandE);
                    let wCardsHtml = handDescription(boardJson._handRecord.HandW);
                    let nCardsHtml = handDescription(boardJson._handRecord.HandN);
                    let sCardsHtml = handDescription(boardJson._handRecord.HandS);
                    let tricksNs = tricksDescription(boardJson._handRecord, [`N`, `S`]);
                    let tricksEw = tricksDescription(boardJson._handRecord, [`W`, `E`]);
                    setHtml(`miniMaxContainer${board}`, miniMaxHtml);
                    setHtml(`eCards${board}`, eCardsHtml);
                    setHtml(`wCards${board}`, wCardsHtml);
                    setHtml(`nCards${board}`, nCardsHtml);
                    setHtml(`sCards${board}`, sCardsHtml);
                    setHtml(`tricksNsSmall${board}`, tricksNs);
                    setHtml(`tricksEwSmall${board}`, tricksEw);
                    let handRec = boardJson._handRecord;
                    setHtml(`bTitle${board}`,
                        `<h1 class="mb-0">${boardJson._numberAsPlayed}</h1>${vulnerabilitiesHuman[handRec.Vulnerability]
                        } / ${declarers[handRec.Dealer]}\n`);
                    setHtml(`bImage${board}`,
                        `<img class="img-fluid" src="./img/board${vulnerabilities[handRec.Vulnerability]}` +
                        `${declarers[handRec.Dealer]}.png">`);
                })
                .fail(() => {
                    setHtml(`board${board}`, `<h3 style="text-align: center;">BOARD ${board}</h3>`);
                });
        });
}

const shortable = {
    'AM': 'M',
    'AP': 'P',
    'AA': 'A',
    'ARB0': '0'
};

function shortenArtificials(contract1, contract2) {
    if (contract1 in shortable && contract2 in shortable)
        return `A${shortable[contract1]}${shortable[contract2]}`;
    if (contract1 === "SIT-OUT" && contract2 === "SIT-OUT")
        return wrapTooltip(contract1);
    return wrapTooltip(`${contract1}|${contract2}`);
}

function wrapTooltip(content, shorter = "ARB") {
    let contentEscaped = content.replace(/"/g, "'");
    let result = `<span class="new-tooltip" data-toggle="tooltip" data-placement="bottom"` +
        ` data-html="true" title="${contentEscaped}">${shorter}</span>`;
    return result;
}

const colorsPics = {
    "nt": `<img class="table-img" src="./img/notrump.gif">`,
    "s": `<img class="table-img" src="./img/spades.gif">`,
    "h": `<img class="table-img" src="./img/hearts.gif">`,
    "d": `<img class="table-img" src="./img/diamonds.gif">`,
    "c": `<img class="table-img" src="./img/clubs.gif">`
}

function parseMiniMax(miniMax) {
    if (miniMax === "PASS")
        return miniMax;
    let miniMaxNew;
    $.each(colorsPics,
        (k, v) => {
            miniMaxNew = miniMax.replace(k, v);
            if (miniMaxNew.localeCompare(miniMax) === -1)
                return false;
        });
    return miniMaxNew;

}

function handDescription(handMap) {
    return `<img class="table-img" src="./img/spades.gif">${handMap.Spades}<br>\n` +
        `<img class="table-img" src="./img/hearts.gif">${handMap.Hearts}<br>\n` +
        `<img class="table-img" src="./img/diamonds.gif">${handMap.Diamonds}<br>\n` +
        `<img class="table-img" src="./img/clubs.gif">${handMap.Clubs}`;

}

function tricksDescription(boardMap, hands) {
    let tricks = `<table class="table table-sm mb-0">\n` +
        '<thead>\n' +
        '<tr>\n' +
        '<th scope="col" class="align-middle text-center"></th>\n' +
        '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/notrump.gif"></th>\n' +
        '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/spades.gif"></th>\n' +
        '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/hearts.gif"></th>\n' +
        '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/diamonds.gif"></th>\n' +
        '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/clubs.gif"></th>\n' +
        '</tr>\n' +
        '</thead>\n' +
        '<tbody>\n';
    $.each(hands,
        (i, value) => {
            let index = "TricksFrom" + value;
            tricks += `<tr>\n` +
                `<td>${value}</td>\n` +
                `<td class="text-center">${boardMap[index].Nt}</td>\n` +
                `<td class="text-center">${boardMap[index].Spades}</td>\n` +
                `<td class="text-center">${boardMap[index].Hearts}</td>\n` +
                `<td class="text-center">${boardMap[index].Diamonds}</td>\n` +
                `<td class="text-center">${boardMap[index].Clubs}</td>\n` +
                `</tr>\n`;
        });
    tricks += `</tbody>\n</table>\n`;
    return tricks;
}

function setHtml(id, html) {
    document.getElementById(id).innerHTML = html;
}

function getHtml(id) {
    return document.getElementById(id).innerHTML;
}

function appendHtml(id, html) {
    var d1 = window.document.getElementById(id);
    d1.insertAdjacentHTML('beforeend', html);
}