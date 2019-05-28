"use strict";

// Convert with babeljs.io before using
// polyfills for Safari 9
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;

        padString = String(typeof padString !== 'undefined' ? padString : ' ');

        if (this.length > targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;

            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }

            return padString.slice(0, targetLength) + String(this);
        }
    };
}

if (!String.prototype.repeat) {
    String.prototype.repeat = function (count) {
        'use strict';

        if (this == null) {
            throw new TypeError('can\'t convert ' + this + ' to object');
        }

        var str = '' + this;
        count = +count;

        if (count != count) {
            count = 0;
        }

        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        }

        if (count == Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }

        count = Math.floor(count);

        if (str.length == 0 || count == 0) {
            return '';
        } // Ensuring count is a 31-bit integer allows us to heavily optimize the
        // main part. But anyway, most current (August 2014) browsers can't handle
        // strings 1 << 28 chars or longer, so:


        if (str.length * count >= 1 << 28) {
            throw new RangeError('repeat count must not overflow maximum string size');
        }

        var maxCount = str.length * count;
        count = Math.floor(Math.log(count) / Math.log(2));

        while (count) {
            str += str;
            count--;
        }

        str += str.substring(0, maxCount - str.length);
        return str;
    };
} // going with hashchange to valid pair after invalid fails - there is no table to fill. Make a separate place for alerts


var hashData = {
    followed: 0,
    leftView: "R",
    mobileView: "R",
    hist: 0,
    board: 1,
    session: 1,
    round: 1,
    segment: 0,
    table: ''
};
var oldHash = $.extend({}, hashData);
var showClassification;
var showCongress;
var showAdjustments;
var showCarryOver;
var showDistricts;
var showRank;
var showClubs;
var showRewards;
var showInfo;
var showNote;
var showDistrictsOnMobile;
var showRankOnMobile;
var showInfoOnMobile;
var showNoteOnMobile;
var showRewardsDescriptions;
var showVpTable;
var showRoundResults;
var showButler;
var showCrossTable;
var showBoardAverage;
var showLeads;
var defaultLanguage;
var resultPrecision;
var tournamentType;
var resultsShouldSumTo1;
var resultsShouldSumTo2;
var teamsShowSum;
var showTwoResults; // map from players to pair numbers, allows to do search based on player number

var playerToParticipant = {};
var participants = null;
var boards = null;
var roundResults = null;
var boardsScoringGroups = null;
var stage = null;
var allStages = null;
var liveResults = false;
var refreshEvery = 30;
var language;
var historyLoaded = -1;
var roundResultsSessionLoaded = -1;
var roundResultsRoundLoaded = -1;
var segmentResultsSessionLoaded = -1;
var segmentResultsRoundLoaded = -1;
var segmentResultsSegmentLoaded = -1;
var segmentResultsTableLoaded = '';
var resultsLoaded = false;
var boardLoaded = -1;
var lastPlayedRound = 1;
var lastPlayedSession = 1;
$(document).ready(function () {
    $(function () {
        $("#gotoSimpler").remove();
    }); // subtle and fragile configuration

    $('form').on('keyup keypress', function (e) {
        var keyCode = e.keyCode || e.which;

        if (keyCode === 13) {
            e.preventDefault();
        }
    });
    $.ajaxSetup({
        cache: false
    });
    $('[data-toggle="tooltip"]').tooltip();
    $("#historyInput").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#historyButton").click();
            this.blur();
        }
    });
    $("#followInput").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#followButton").click();
            this.blur();
        }
    });
    $("#followInputModal").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#followModalButton").click();
            this.blur();
        }
    });
    $("#fetchBoardInput").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#fetchButtonInput").click();
            this.blur();
        }
    }); // load data according to hash

    window.onhashchange = function () {
        getHash();
        $('[data-toggle="tooltip"]').tooltip("hide");
        var hashScroll = window.Cookies.get('fresh-followed');
        window.Cookies.remove('fresh-followed');

        if (!hashScroll) {
            hashScroll = $("#topNavbar").offset().top + 'px';
        } else {
            $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
        }

        updateLinks();
        loadPanels(hashScroll);
        oldHash = Object.assign({}, hashData);
    };

    loadSettings(true);
});

function setLanguage(lang) {
    try {
        if (lang !== null) localStorage.setItem('languageTC', lang); else {
            var langNow = localStorage.getItem('languageTC');
            if (langNow === "undefined" || langNow === null) localStorage.setItem('languageTC', defaultLanguage);
        }
        lang = localStorage.getItem('languageTC');
    } catch (error) {
        if (lang === null) lang = defaultLanguage;
    }

    $.ajax({
        url: 'language/' + lang + '.json',
        dataType: 'json',
        async: false,
        success: function success(file) {
            language = file;
        }
    });
    $('#navLinkR').text(language.results);
    $('#navLinkH').text(language.privateScores);
    $('#navLinkB').text(language.boards);
    $('#navLinkO').text(language.roundResults);
    $('#navLinkC').text(language.crossTable);
    $('#followButton').text(language.follow);
    $('#unfollowButton').text(language.unfollow);
    $('#followModalButton').text(language.follow);
    $('#unfollowModalButton').text(language.unfollow);
    $('#vpTableModalTitle').text(language.vpTableLink);
    $('#fetchButtonInput').text(language.fetchBoardButton);
    $('#followInput').attr("placeholder", language.followPlaceholder);
    $('#followInputModal').attr("placeholder", language.followPlaceholder);
    $('#historyInput').attr("placeholder", language.followPlaceholder);
    $('#fetchBoardInput').attr("placeholder", language.fetchBoardPlaceholder);
    $('#historyButton').text(language.showHistory);
    $('#roundHL').text(language.roundHL);
    $('#opponentHL').text(language.opponentHL);
    $('#boardHL').text(language.boardHL);
    $('#lineHL').text(language.lineHL);
    $('#contractHL').text(language.contractHL);
    $('#declarerHL').text(language.declarerHL);
    $('#leadHL').text(language.leadHL);
    $('#tricksHL').text(language.tricksHL);
    $('#scoreHL').text(language.scoreHL);
    $('#resultHL').text(language.resultHL);
    $('#currentResultHLText').text(language.currentResultHL);
    $('#vpTableLinkHLText').text(language.vpTableLink);
    $('#boardHS').text(language.boardHS);
    $('#lineHS').text(language.lineHS);
    $('#contractHS').text(language.contractHS);
    $('#declarerHS').text(language.declarerHS);
    $('#leadHS').text(language.leadHS);
    $('#tricksHS').text(language.tricksHS);
    $('#scoreHS').text(language.scoreHS);
    $('#impHL').text(language.sum);
    $('#impHS').text(language.sum);
    $('#adjHL').text(language.adjHL);
    $('#adjHS').text(language.adjHS);
    $('#currentResultHSText').text(language.currentResultHS);
    $('#vpTableLinkHSText').text(language.vpTableLinkShort);
    $('#placeColumn').text(language.placeColumn);
    $('#pairColumn').text(language.pairColumn);
    $('#playersColumn').text(language.playersColumn);
    $('#districtColumn').text(language.districtColumn);
    $('#infoColumn').text(language.infoColumn);
    $('#rankColumn').text(language.rankColumn);
    $('#clubColumn').text(language.clubColumn);
    $('#noteColumn').text(language.noteColumn);
    $('#scoreColumnText').text(language.scoreColumn);
    $('#vpTableLinkText').text(language.vpTableLink);
    $('#classificationColumn').text(language.classificationColumn);
    $('#congressColumn').text(language.congressColumn);
    $('#descriptionColumn').text(language.descriptionColumn);
    $('#rewardColumn').text(language.rewardColumn);
    $('#carryOverColumn').text(language.carryOverColumn);
    $('#sessionResultColumn').text(language.sessionResultColumn);
    $('#nsBL').text(language.nsBL);
    $('#ewBL').text(language.ewBL);
    $('#contractBL').text(language.contractBL);
    $('#declarerBL').text(language.declarerBL);
    $('#leadBL').text(language.leadBL);
    $('#tricksBL').text(language.tricksBL);
    $('#scoreBL').text(language.scoreBL);
    $('#resultBL').text(language.resultBL);
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
    $('#tableBL').text(language.tableBL);
    $('#hostBL').text(language.hostBL);
    $('#guestBL').text(language.guestBL);
    $('#tableBS').text(language.tableBS);
    $('#hostBS').text(language.hostBS);
    $('#guestBS').text(language.guestBS);
    $('#oTableColumn').text(language.oTableColumn);
    $('#followModalTitle').text(language.followModalTitle);
    $('#liveResultsText').text(language.liveResultsText);
    $('#copyToClipboardTooltip0').attr("title", language.copyToClipboard);
    $('#historyFormHeader').text(language.historyFormHeader);
    $('#stagesNavbarHeader').text(language.stagesNavbarHeader);
    $('#tcWebpage').text(language.tcWebpage);
    $('#tcWebpage').attr("href", "http://" + language.tcWebpage);
    $('#contractOSL').text(language.contractHL);
    $('#declarerOSL').text(language.declarerHL);
    $('#leadOSL').text(language.leadHL);
    $('#tricksOSL').text(language.tricksHL);
    $('#scoreOSL').text(language.scoreHL);
    $('#boardSL').text(language.boardHL);
    $('#boardSS').text(language.boardHL);
    $('#contractCSL').text(language.contractHL);
    $('#declarerCSL').text(language.declarerHL);
    $('#leadCSL').text(language.leadHL);
    $('#tricksCSL').text(language.tricksHL);
    $('#scoreCSL').text(language.scoreHL);
    $('#impsSL').text(language.resultHL);
    $('#imps2SL').text(language.resultHL);
    $('#scoreNsOSL').text(language.nsBL);
    $('#scoreEwOSL').text(language.ewBL);
    $('#scoreNsCSL').text(language.nsBL);
    $('#scoreEwCSL').text(language.ewBL);
    $('#impsNsSL').text(language.nsBL);
    $('#impsEwSL').text(language.ewBL);
    $('#openSL').text(language.openCaps);
    $('#closedSL').text(language.closedCaps);
    $('#openSS').text(language.openCaps);
    $('#closedSS').text(language.closedCaps);
    $('#oVpColumn').text(language.resultHL);
    $('#dropdownRosterButton').text(language.roster);
    $('#rosterIdColumn').text(language.id);
    $('#rosterPlayerColumn').text(language.playersColumn);
    $('#rosterDistrictColumn').text(language.districtColumn);
    $('#rosterRankColumn').text(language.rankColumn);
    $('#rosterInfoColumn').text(language.infoColumn);
    $('#rosterClubColumn').text(language.clubColumn);
    $('#rosterNoteColumn').text(language.noteColumn);
    $('#placeI').text(language.placeColumn);
    $('#personI').text(language.playersColumn);
    $('#resultI').text(language.resultBL);
    $('#placeC').text(language.placeColumn); //$('#teamC').text(language.playersColumn);

    $('#resultC').text(language.resultBL);
    $('#oImpColumn').text(language.sum);
}

function loadSettings(initial) {
    // headers
    var settingsJson = "./settings.json";
    $.getJSON(settingsJson).done(function (settings) {
        document.title = "".concat(settings.FullName);
        setHtml("pcHeader", settings.HtmlHeader);
        setHtml("mobileHeader", settings.HtmlMobileHeader);

        try {
            eval(settings.JavaScriptToRun);
        } catch (e) {
            console.log("Error in custom JS script! " + e.message);
        }

        setHtml("programVersion", settings.ProgramVersion);
        setHtml("generatedTime", settings.TimeCreated);
        participants = settings.ParticipantNumers;

        if (initial) {
            liveResults = settings.LiveResults;
            stage = settings.Stage;
            allStages = settings.AllStages;
            loadStages();
        }

        tournamentType = settings.TournamentType;
        refreshEvery = 1000 * settings.RefreshEverySeconds;
        showClassification = settings.ShowClassificationPoints;
        showCongress = settings.ShowCongressPoints;
        showAdjustments = settings.ShowAdjustments;
        showCarryOver = settings.ShowCarryOver;
        showDistricts = settings.ShowDistricts && tournamentType !== 2;
        showRank = settings.ShowRank && tournamentType !== 2;
        showInfo = settings.ShowInfo && tournamentType !== 2;
        showNote = settings.ShowNote;
        showClubs = settings.ShowClubs && tournamentType !== 2;
        showRewards = settings.ShowRewards;
        showRewardsDescriptions = settings.ShowRewardsDescriptions;
        showDistrictsOnMobile = settings.ShowDistrictsOnMobile;
        showRankOnMobile = settings.ShowRankOnMobile;
        showInfoOnMobile = settings.ShowInfoOnMobile;
        showNoteOnMobile = settings.ShowNoteOnMobile;
        showVpTable = settings.ShowVpTable;
        showRoundResults = settings.ShowRoundResults;
        showButler = settings.ShowButler;
        showCrossTable = settings.ShowCrossTable;
        showBoardAverage = settings.ShowBoardAverage;
        showLeads = settings.ShowLeads;
        resultPrecision = settings.ResultsPresentationPrecision;
        defaultLanguage = settings.DefaultLanguage;
        lastPlayedRound = settings.LastPlayedRound;
        lastPlayedSession = settings.LastPlayedSession;
        teamsShowSum = settings.TeamsShowSum;
        resultsShouldSumTo1 = settings.ResultsShouldSumTo1;
        resultsShouldSumTo2 = settings.ResultsShouldSumTo2;
        showTwoResults = settings.ShowTwoResults;
        setLanguage(null);
        var buttons = 4;

        if (showRoundResults) {
            buttons++;
            document.getElementById("navLinkO").classList.remove("d-none");
            document.getElementById("navButtonODiv").classList.remove("d-none");
        } else {
            document.getElementById("navLinkO").classList.add("d-none");
            document.getElementById("navButtonODiv").classList.add("d-none");
        }

        if (showButler) {
            buttons++;
            document.getElementById("navLinkI").classList.remove("d-none");
            document.getElementById("navButtonIDiv").classList.remove("d-none");
        } else {
            document.getElementById("navLinkI").classList.add("d-none");
            document.getElementById("navButtonIDiv").classList.add("d-none");
        }

        if (showCrossTable) {
            document.getElementById("navLinkC").classList.remove("d-none");
            document.getElementById("navButtonCDiv").classList.remove("d-none");

            if (showButler && showRoundResults) {
                document.getElementById("navButtonHDiv").classList.add("d-none");
            } else {
                buttons++;
                document.getElementById("navButtonHDiv").classList.remove("d-none");
            }
        } else {
            document.getElementById("navLinkC").classList.add("d-none");
            document.getElementById("navButtonCDiv").classList.add("d-none");
        }

        $("#buttonsRow>div").removeClass("btnContainer4");
        $("#buttonsRow>div").removeClass("btnContainer5");
        $("#buttonsRow>div").removeClass("btnContainer6");
        $("#buttonsRow>div").addClass("btnContainer".concat(buttons));
        boards = settings.BoardNumers;
        roundResults = settings.RoundsNumbers;
        boardsScoringGroups = settings.BoardsScoringGroups;
        addTdData(settings);

        if (initial) {
            // if this is live, schedule refresh
            if (liveResults) {
                document.getElementById("liveResults").classList.remove("d-none");
                document.getElementById("countedBoardsColumn").classList.remove("d-none");
                refreshPeriodically();
            } else {
                document.getElementById("liveResults").classList.add("d-none");
                document.getElementById("countedBoardsColumn").classList.add("d-none");
            }
        }

        getHash(); // load results (in left panel)
        // load panels: boards, history, navbar, set right left panel visible

        if (initial) {
            updateLinks();
            loadVpTable();
            loadResults();
            loadPanels();
        }
    });
}

function loadStages() {
    if (allStages.length > 1) {
        document.getElementById("stagesNavbar").classList.remove("d-none");
        var links = "";
        $.each(allStages, function (index, value) {
            links += "<li class=\"nav-item\">" + "<a class=\"nav-link clickable\" style=\"font-size: medium;\" " + "href=\"".concat((stage._id >= 0 ? "../" : "") + (value._id >= 0 ? value._id + "/" : ""), "index.html\">").concat(value._name, "</a></li>");
        });
        setHtml("stages", links);
    } else {
        document.getElementById("stagesNavbar").classList.add("d-none");
    }
}

function refreshPeriodically() {
    setTimeout(function () {
        $('[data-toggle="tooltip"]').tooltip("hide");

        if (hashData.mobileView === "R" && hashData.leftView === "R" && hashData.followed !== 0 && isElementInViewport($("#contentR tr[data-participants*='|".concat(hashData.followed, "|']"))[0])) {
            loadResults(-1);
        } else {
            loadResults();
        }

        loadPanels();
        loadSettings(false);
        refreshPeriodically();
    }, refreshEvery);
}

function wellDefined(something) {
    if (something === null) return false;
    if (something === "") return false;
    return true;
}

function addTdData(settings) {
    if (wellDefined(settings.TdFirstName) || wellDefined(settings.TdLastName)) {
        $("#tdInfo")[0].classList.remove("d-none");
        var td = "".concat(settings.TdFirstName, " ").concat(settings.TdLastName);

        if (wellDefined(settings.TdId)) {
            td = "<a class=\"clickable\" target=\"_blank\"" + "href=\"https://msc.com.pl/cezar/?p=21&pid=".concat(settings.TdId, "\">") + td + "</a>";
        }

        setHtml("tdName", "".concat(language.tournamentDirectedBy, " ").concat(td));

        if (wellDefined(settings.TdEmail)) {
            $("#tdMail")[0].classList.remove("d-none");
            $("#tdMail").attr("href", "mailto:".concat(settings.TdEmail));
        } else {
            $("#tdMail")[0].classList.add("d-none");
        }
    } else {
        $("#tdInfo")[0].classList.add("d-none");
    }
}

function loadPanels(whereToScroll) {
    // everything that goes from hash
    setNavBarActive();
    setPanels();
    var histPromise = setHistoryContentLazy();
    var boardPromise = setBoardContentLazy();
    var roundResultsPromise = setRoundResultsContentLazy();
    var segmentResultsPromise = setSegmentResultsLazy();
    var butlerPromise = setButlerContentLazy();
    var crossTablePromise = setCrossTableContentLazy();
    Promise.all([histPromise, boardPromise, roundResultsPromise, segmentResultsPromise, butlerPromise, crossTablePromise]).then(function () {
        return onHistAndBoardPromiseFinished(whereToScroll);
    }, function () {
        return onHistAndBoardPromiseFinished(whereToScroll);
    });
}

var tabs = ["R", "H", "B", "O", "S", "I", "C"];
var lefties = ["R", "H", "O", "S", "I", "C"];
var currentHash;
var leftTabStart = 4;
var leftTabEnd = 5;
var mobileTabEnd = 6;
var pairStart = 6;
var pairEnd = 9;
var boardStart = 9;
var boardEnd = 12;
var roundResultSessionStart = 12;
var roundResultSessionEnd = 15;
var roundResultRoundStart = 15;
var roundResultRoundEnd = 18;
var roundResultSegmentStart = 18;
var roundResultSegmentEnd = 21;
var tableStart = 21;
var tableEnd = 27;

function updateLinks() {
    currentHash = getHashLink();
    updateLinksLeftTab();
    updateButtonsLeftTab();
    updateLinksBoardsMove();
    updatePairNumberLinks();
    updateBoardNumberLinks();
    updateLinksRoundResultsMove();
    updateRoundResultsLinks();
    updateSegmentsLinks();
}

function updatePairNumberLinks() {
    $("a.pairNumberLink").each(function (index, value) {
        var node = $(value);
        var pairNumber = node.attr("data-pair-number");
        var newHash = changeHash(pairStart, pairEnd, pairNumber.padStart(3, "0"));
        newHash = changeHashExisting(newHash, leftTabStart, mobileTabEnd, "HH");
        node.attr("href", newHash);
    });
}

function updateSegmentsLinks() {
    $("a.segmentLink").each(function (index, value) {
        var node = $(value);
        var session = node.attr("data-session-number");
        var round = node.attr("data-round-number");
        var segment = node.attr("data-segment-number");
        var table = node.attr("data-table");
        var newHash = changeHash(roundResultSessionStart, roundResultSessionEnd, session.padStart(3, "0"));
        newHash = changeHashExisting(newHash, roundResultRoundStart, roundResultRoundEnd, round.padStart(3, "0"));
        newHash = changeHashExisting(newHash, roundResultSegmentStart, roundResultSegmentEnd, segment.padStart(3, "0"));
        newHash = changeHashExisting(newHash, tableStart, tableEnd, table.padStart(6, "0"));
        newHash = changeHashExisting(newHash, leftTabStart, mobileTabEnd, "SS");
        node.attr("href", newHash);
    });
}

function updateRoundResultsLinks() {
    $("a.roundResultLink").each(function (index, value) {
        var node = $(value);
        var session = node.attr("data-session-number");
        var round = node.attr("data-round-number");
        var newHash = changeHash(roundResultSessionStart, roundResultSessionEnd, session.padStart(3, "0"));
        newHash = changeHashExisting(newHash, roundResultRoundStart, roundResultRoundEnd, round.padStart(3, "0"));
        newHash = changeHashExisting(newHash, leftTabStart, mobileTabEnd, "OO");
        node.attr("href", newHash);
    });
}

function updateBoardNumberLinks() {
    $("a.boardNumberLink").each(function (index, value) {
        var node = $(value);
        var pairNumber = node.attr("data-board-number");
        var newHash = changeHash(boardStart, boardEnd, pairNumber.padStart(3, "0"));
        newHash = changeHashExisting(newHash, leftTabEnd, mobileTabEnd, "B");
        node.attr("href", newHash);
    });
}

function updateLinksRoundResultsMove() {
    var oldRoundBegin = Number(getHtml("beginRoundResultIndicator"));
    var oldSessionBegin = Number($("#beginRoundResultIndicator").attr("data-session"));
    var roundResultIndex = roundResults.indexOf(oldSessionBegin * 1000 + oldRoundBegin);

    if (roundResultIndex >= 0) {
        $("#roundResultNavUp .boardNav").each(function (index, value) {
            updateRoundResultLink(roundResultIndex, index, value);
        });
        $("#roundResultNavDown .boardNav").each(function (index, value) {
            updateRoundResultLink(roundResultIndex, index, value);
        });
    }
}

function updateRoundResultLink(newIndex, index, value) {
    var roundResultNumber = roundResults.length > newIndex + index ? (roundResults[newIndex + index] % 1000).toString() : "";
    var roundResultSessionNumber = roundResults.length > newIndex + index ? Math.floor(roundResults[newIndex + index] / 1000).toString() : "";
    value.innerHTML = roundResultNumber;
    $(value).attr("data-session", roundResultSessionNumber);
    var newHash = changeHash(roundResultSessionStart, roundResultRoundEnd, roundResultSessionNumber.padStart(3, "0") + roundResultNumber.padStart(3, "0"));
    $(value).attr("href", newHash);
}

function updateLinksBoardsMove() {
    var oldBegin = Number(getHtml("beginBoardIndicator0"));
    var boardIndex = boards.indexOf(oldBegin);

    if (boardIndex >= 0) {
        $(".boardNavUp").each(function (index, value) {
            $(value).find(".boardNav").each(function (index, value) {
                var boardNumber = boards.length > boardIndex + index ? boards[boardIndex + index].toString() : "";
                value.innerHTML = boardNumber;
                var newHash = changeHash(boardStart, boardEnd, boardNumber.padStart(3, "0"));
                $(value).attr("href", newHash);
            });
        });
        $(".boardNavDown").each(function (index, value) {
            $(value).find(".boardNav").each(function (index, value) {
                var boardNumber = boards.length > boardIndex + index ? boards[boardIndex + index].toString() : "";
                value.innerHTML = boardNumber;
                var newHash = changeHash(boardStart, boardEnd, boardNumber.padStart(3, "0"));
                $(value).attr("href", newHash);
            });
        });
    }
}

function updateLinksLeftTab() {
    var tab;
    var elem;
    var value;

    for (var _i = 0, _lefties = lefties; _i < _lefties.length; _i++) {
        tab = _lefties[_i];
        elem = $("#navLink" + tab);
        value = changeHash(leftTabStart, mobileTabEnd, tab + tab);
        elem.attr("href", value);
    }

    elem = $("#navLinkB");
    value = changeHash(leftTabEnd, mobileTabEnd, "B");
    elem.attr("href", value);
}

function updateButtonsLeftTab() {
    var tab;
    var value;
    var elem;

    for (var _i2 = 0, _arr = ["R", "H", "O", "I", "C"]; _i2 < _arr.length; _i2++) {
        tab = _arr[_i2];
        elem = $("#navButton" + tab);
        value = changeHash(leftTabStart, mobileTabEnd, tab + tab);
        elem.attr("href", value);
    }

    elem = $("#navButtonB");
    value = changeHash(leftTabEnd, mobileTabEnd, "B");
    elem.attr("href", value);
}

function changeHash(fromPos, toPos, value) {
    return currentHash.substring(0, fromPos) + value.toString() + currentHash.substring(toPos);
}

function changeHashExisting(hash, fromPos, toPos, value) {
    return hash.substring(0, fromPos) + value.toString() + hash.substring(toPos);
}

function onHistAndBoardPromiseFinished(whereToScroll) {
    safeScroll(whereToScroll); //activates new tooltips

    $(function () {
        $('.new-tooltip').tooltip();
        $.each($('.new-tooltip'), function (index, value) {
            value.classList.remove("new-tooltip");
        });
    });
}

function getHash() {
    var hash = window.location.hash;
    var followed = parseInt(hash.substr(1, 3));

    if (!isNaN(followed)) {
        hashData.followed = followed;
    } else {
        hashData.followed = 0;
    }

    var leftView = hash.substr(4, 1);

    if (leftView === "H" || leftView === "R" || leftView === "O" || leftView === "S" || leftView === "I" || leftView === "C") {
        hashData.leftView = leftView;
    } else {
        hashData.leftView = "R";
    }

    var mobileView = hash.substr(5, 1);

    if (mobileView === "H" || mobileView === "B" || mobileView === "R" || mobileView === "O" || mobileView === "S" || mobileView === "I" || leftView === "C") {
        hashData.mobileView = mobileView;
    } else {
        hashData.mobileView = "R";
    }

    var hist = parseInt(hash.substr(6, 3));

    if (!isNaN(hist)) {
        hashData.hist = hist;
    } else {
        hashData.hist = 0;
    }

    var board = parseInt(hash.substr(9, 3));

    if (!isNaN(board)) {
        hashData.board = board;
    } else {
        if (liveResults) {
            hashData.board = boards.length === 0 ? 1 : boards[boards.length - 1];
        } else hashData.board = boards.length === 0 ? 1 : boards[0];
    }

    var session = parseInt(hash.substr(12, 3));
    var round = parseInt(hash.substr(15, 3));

    if (!isNaN(board)) {
        hashData.round = round;
        hashData.session = session;
    } else {
        if (liveResults) {
            hashData.round = lastPlayedRound;
            hashData.session = lastPlayedSession;
        } else {
            hashData.round = roundResults.length === 0 ? 1 : roundResults[0] % 1000;
            hashData.session = roundResults.length === 0 ? 1 : Math.floor(roundResults[0] / 1000);
        }
    }

    var segment = parseInt(hash.substr(18, 3));

    if (!isNaN(segment)) {
        hashData.segment = segment;
    } else {
        hashData.segment = 0;
    }

    var table = hash.substr(21, 6).replace(/^0+/g, '');
    hashData.table = table;
}

function setNavBarActive() {
    $.each(document.getElementsByClassName("nav-link"), function (index, value) {
        value.classList.remove("active");
    });

    if (hashData.leftView === "B") {
        document.getElementById("navLinkR").classList.add("active");
    } else if (hashData.leftView !== "S") {
        document.getElementById("navLink".concat(hashData.leftView)).classList.add("active");
    }
}

function setPanels() {
    $.each(document.getElementsByClassName("leftTab"), function (index, value) {
        value.classList.remove("d-xl-block");
        value.classList.add("d-none");
    });
    document.getElementById("tab".concat(hashData.mobileView)).classList.remove("d-none");

    if (hashData.mobileView === "B") {
        document.getElementById("tab".concat(hashData.leftView)).classList.add("d-xl-block");
    } else {
        document.getElementById("tabB").classList.add("d-xl-block");
    }
}

function setCrossTableContentLazy() {
    if (!showButler) return Promise.resolve();
    setHtml("alertI", "");
    var crossTableJson = "./cs.json";
    return $.getJSON(crossTableJson).done(function (crossTable) {
        $(".crossTableCol").remove();

        for (var i = 0; i < crossTable.Teams; i++) {
            $('#cThL').find('th').eq(2 + i).after("<th scope=\"col\" class=\"align-middle text-center crossTableCol\">" + "".concat(i + 1, "</th>"));
        }

        var crossTableHtml = "";
        $.each(crossTable.ParticipantRoundResults, function (index, value) {
            crossTableHtml += createCrossTableRow(value, crossTable.Teams, index);
        });
        setHtml("cBody", crossTableHtml);
        updateLinks();
        document.getElementById("alertC").classList.add("d-none");
        document.getElementById("tableC").classList.remove("d-none");
    }).fail(function () {
        setHtml("alertC", '<div class="alert alert-info" role="alert">\n' + 'Fetching cross table failed.\n' + 'Individual classification might have not been published yet.\n' + '</div>');
        document.getElementById("alertC").classList.remove("d-none");
        document.getElementById("tableC").classList.add("d-none");
    });
}

function createCrossTableRow(json, teams, index) {
    var people = "";

    json.Participant._people.forEach(function (person) {
        if (person._pid.__type !== "NoPid:#TournamentStructure") {
            people += getPlayer(person) + "<br/>";
        }
    });

    var names = "<a href=\"\" data-pair-number=\"".concat(json.Participant.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(people, json.Participant._name) + "</a>";
    var row = "<tr><td class=\"align-middle text-center\">".concat(json.Place, "</td>") + "<td class=\"align-middle text-left\">".concat(names, "</td>") + "<td class=\"align-middle text-center\"><strong>".concat(Math.round(json.Result * 100) / 100, "</strong></td>");
    var nextOpponentIndex = 1;
    var i = 0;

    while (i < json.Segments.length) {
        while (json.Segments[i].Segment !== nextOpponentIndex) {
            row += "<td class=\"".concat(index === nextOpponentIndex - 1 ? "table-dark" : "", "\"></td>");
            nextOpponentIndex++;
        }

        row += "<td class=\"align-middle ".concat(liveResults && json.Segments[i].Live ? "table-primary" : "", " text-center\">");
        var first = true;

        while (i < json.Segments.length && json.Segments[i].Segment === nextOpponentIndex) {
            if (!first) row += "<br>";
            row += "<a href=\"\" data-session-number=\"".concat(json.Segments[i].Session, "\"  ") + "data-round-number=\"".concat(json.Segments[i].Round, "\" class=\"roundResultLink clickable\">") + "".concat(Math.round(json.Segments[i].Result * 100) / 100, "</a>");
            i++;
            first = false;
        }

        row += "</td>";
        nextOpponentIndex++;
    }

    for (var _i3 = nextOpponentIndex; _i3 <= teams; _i3++) {
        row += "<td class=\"".concat(index === _i3 - 1 ? "table-dark" : "", "\"></td>");
    }

    row += "</tr>";
    return row;
}

function setButlerContentLazy() {
    if (!showButler) return Promise.resolve();
    setHtml("alertI", "");
    var butlerJson = "./butler.json";
    return $.getJSON(butlerJson).done(function (butler) {
        $(".butlerCol").remove();
        $.each(butler.Segments, function (index, value) {
            $('#iThL').find('th').eq(4 + index).after("<th scope=\"col\" class=\"align-middle text-center butlerCol\">" + "".concat(value.Item1, "-").concat(value.Item2, "-").concat(value.Item3 + 1, "</th>"));
        });
        var butlerHtml = "";
        $.each(butler.ParticipantsResultsBySegmentsWithResult, function (index, value) {
            butlerHtml += createButlerRow(value, butler.Segments);
        });
        setHtml("iBody", butlerHtml);
        document.getElementById("alertI").classList.add("d-none");
        document.getElementById("tableI").classList.remove("d-none");
        updateLinks();
    }).fail(function () {
        setHtml("alertI", '<div class="alert alert-info" role="alert">\n' + 'Fetching individual classification failed.\n' + 'Individual classification might have not been published yet.\n' + '</div>');
        document.getElementById("alertI").classList.remove("d-none");
        document.getElementById("tableI").classList.add("d-none");
    });
}

function createButlerRow(json, segments) {
    var nextSegmentIndex = 0;
    var people = "";

    json.Item6._people.forEach(function (person) {
        if (person._pid.__type !== "NoPid:#TournamentStructure") {
            people += getPlayer(person) + "<br/>";
        }
    });

    var row = "<tr><td class=\"align-middle text-center\">".concat(json.Item5, "</td>") + "<td class=\"align-middle text-left\">".concat(getPlayer(json.Item1._person), "</td>") + "<td class=\"align-middle text-left d-sm-table-cell d-none\">" + "<a href=\"\" data-pair-number=\"".concat(json.Item6.Number, "\" class=\"pairNumberLink clickable\">") + "".concat(wrapTooltip(people, json.Item6._name), "</a></td>") + "<td class=\"align-middle text-center\"><strong>".concat(Math.round(json.Item2 * 100) / 100, "</strong></td>") + "<td class=\"align-middle text-center\">".concat(json.Item4, "</td>");

    for (var i = 0; i < json.Item3.length; i++) {
        while (json.Item3[i].Item1 !== segments[nextSegmentIndex].Item1 || json.Item3[i].Item2 !== segments[nextSegmentIndex].Item2 || json.Item3[i].Item3 !== segments[nextSegmentIndex].Item3) {
            row += "<td></td>";
            nextSegmentIndex++;
        }

        row += "<td class=\"align-middle text-center\">".concat(Math.round(json.Item3[i].Item4 * 100) / 100, "</td>");
        nextSegmentIndex++;
    }

    for (var _i4 = nextSegmentIndex; _i4 < segments.length; _i4++) {
        row += "<td></td>";
    }

    row += "</tr>";
    return row;
}

function setSegmentResultsLazy() {
    if (segmentResultsRoundLoaded === hashData.round && segmentResultsSessionLoaded === hashData.session && segmentResultsSegmentLoaded === hashData.segment && segmentResultsTableLoaded === hashData.table && hashData.round === oldHash.round && !liveResults) return Promise.resolve();

    if (showTwoResults) {
        document.getElementById("imps2SL").classList.add("d-md-table-cell");
        document.getElementById("impsNs2SL").classList.add("d-md-table-cell");
        document.getElementById("impsEw2SL").classList.add("d-md-table-cell");
    } else {
        document.getElementById("imps2SL").classList.remove("d-md-table-cell");
        document.getElementById("impsNs2SL").classList.remove("d-md-table-cell");
        document.getElementById("impsEw2SL").classList.remove("d-md-table-cell");
    }

    if (showLeads) {
        document.getElementById("leadOSL").classList.remove("d-none");
        document.getElementById("leadCSL").classList.add("d-md-table-cell");
        $(".segmentWide").attr('colspan', 13);
        $(".segmentNarrow").attr('colspan', 6);
        $(".segmentMobile").attr('colspan', 9);
    } else {
        document.getElementById("leadOSL").classList.add("d-none");
        document.getElementById("leadCSL").classList.remove("d-md-table-cell");
        $(".segmentWide").attr('colspan', 11);
        $(".segmentNarrow").attr('colspan', 5);
        $(".segmentMobile").attr('colspan', 8);
    }

    setHtml("alertS", "");
    var segmentResultJson = "./s".concat(hashData.table, "-").concat(hashData.session, "-").concat(hashData.round, "-").concat(hashData.segment, ".json");
    return $.getJSON(segmentResultJson).done(function (sr) {
        var segmentResultsHtml = "";
        var columnsBig = 13 - (showLeads ? 0 : 2);
        var columnsSmall = 7 - (showLeads ? 0 : 1);

        if (!sr.FirstSegment) {
            segmentResultsHtml += "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none border-0\">").concat(language.previousSegments, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell border-0\">") + "".concat(language.previousSegments, ":</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsHostPrevious1, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsGuestPrevious1, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ImpsHostPrevious1, "-") + "".concat(sr.ImpsGuestPrevious1, "</td>") + (showTwoResults ? "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsHostPrevious2, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsGuestPrevious2, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ImpsHostPrevious2, "-") + "".concat(sr.ImpsGuestPrevious2, "</td>") : "") + "</tr>";
        }

        $.each(sr.Scores, function (index, value) {
            segmentResultsHtml += createSegmentResultRow(value);
        });
        segmentResultsHtml += "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none border-0\">").concat(language.segmentFull, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell border-0\">").concat(language.segmentFull, ":</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultHostSegment1, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultGuestSegment1, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ResultHostSegment1, "-").concat(sr.ResultGuestSegment1, "</td>") + (showTwoResults ? "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultHostSegment2, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultGuestSegment2, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ResultHostSegment2, "-").concat(sr.ResultGuestSegment2, "</td>") : "") + "</tr>";

        if (!sr.FirstSegment) {
            segmentResultsHtml += "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none border-0\">").concat(language.sum, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell border-0\">").concat(language.sum, ":</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsHostAfter1, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsGuestAfter1, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ImpsHostAfter1, "-").concat(sr.ImpsGuestAfter1, "</td>") + (showTwoResults ? "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsHostAfter2, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ImpsGuestAfter2, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ImpsHostAfter2, "-").concat(sr.ImpsGuestAfter2, "</td>") : "") + "</tr>";
        }

        segmentResultsHtml += "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none border-0\">").concat(language.resultHL, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell border-0\">").concat(language.resultHL, ":</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultHost1, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultGuest1, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ResultHost1, "-").concat(sr.ResultGuest1, "</td>") + (showTwoResults ? "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultHost2, "</td>") + "<td class=\"text-center d-none d-md-table-cell\">".concat(sr.ResultGuest2, "</td>") + "<td class=\"text-center d-md-none\">".concat(sr.ResultHost2, "-").concat(sr.ResultGuest2, "</td>") : "") + "</tr>";
        var peopleNs = "";

        sr.Host._people.forEach(function (person) {
            if (person._pid.__type !== "NoPid:#TournamentStructure") {
                peopleNs += getPlayer(person) + "<br/>";
            }
        });

        var namesNs = "<a href=\"\" data-pair-number=\"".concat(sr.Host.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(peopleNs, sr.Host._name + " <small>(".concat(sr.Host.Number, ")</small>")) + "</a>";
        var peopleEw = "";

        sr.Guest._people.forEach(function (person) {
            if (person._pid.__type !== "NoPid:#TournamentStructure") {
                peopleEw += getPlayer(person) + "<br/>";
            }
        });

        var namesEw = "<a href=\"\" data-pair-number=\"".concat(sr.Guest.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(peopleEw, sr.Guest._name + " <small>(".concat(sr.Guest.Number, ")</small>")) + "</a>";
        setHtml("sBody", segmentResultsHtml);
        setHtml("hostSL", namesNs);
        setHtml("guestSL", namesEw);
        setHtml("hostSS", namesNs);
        setHtml("guestSS", namesEw);
        setHtml("tableRoundSL", "<a href=\"\" data-session-number=\"".concat(hashData.session, "\"  data-round-number=\"").concat(hashData.round, "\" class=\"roundResultLink clickable\">") + "".concat(language.roundCaps, " ").concat(hashData.round, "</a>, ").concat(language.segmentCaps, " ").concat(hashData.segment + 1, ", ").concat(language.tableCaps, " ").concat(hashData.table));
        setHtml("openNsSL", "".concat(language.nsBL, ": ").concat(getPlayer(sr.OpenNs._person1), " - ").concat(getPlayer(sr.OpenNs._person2)));
        setHtml("closedNsSL", "".concat(language.nsBL, ": ").concat(getPlayer(sr.ClosedNs._person1), " - ").concat(getPlayer(sr.ClosedNs._person2)));
        setHtml("openEwSL", "".concat(language.ewBL, ": ").concat(getPlayer(sr.OpenEw._person1), " - ").concat(getPlayer(sr.OpenEw._person2)));
        setHtml("closedEwSL", "".concat(language.ewBL, ": ").concat(getPlayer(sr.ClosedEw._person1), " - ").concat(getPlayer(sr.ClosedEw._person2)));
        setHtml("openNsSS", "".concat(language.nsBL, ": ").concat(getPlayer(sr.OpenNs._person1), " - ").concat(getPlayer(sr.OpenNs._person2)));
        setHtml("closedNsSS", "".concat(language.nsBL, ": ").concat(getPlayer(sr.ClosedNs._person1), " - ").concat(getPlayer(sr.ClosedNs._person2)));
        setHtml("openEwSS", "".concat(language.ewBL, ": ").concat(getPlayer(sr.OpenEw._person1), " - ").concat(getPlayer(sr.OpenEw._person2)));
        setHtml("closedEwSS", "".concat(language.ewBL, ": ").concat(getPlayer(sr.ClosedEw._person1), " - ").concat(getPlayer(sr.ClosedEw._person2)));
        updateLinks();
        $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
        document.getElementById("alertS").classList.add("d-none");
        document.getElementById("tableS").classList.remove("d-none");
        roundResultsRoundLoaded = hashData.round;
        roundResultsSessionLoaded = hashData.session;
    }).fail(function () {
        if (segmentResultsRoundLoaded !== hashData.round || segmentResultsSessionLoaded !== hashData.session || segmentResultsSegmentLoaded !== hashData.segment || segmentResultsTableLoaded !== hashData.table) {
            setHtml("alertS", '<div class="alert alert-info" role="alert">\n' + 'Fetching segment results failed.\n' + 'These segment results might have not been published yet.\n' + '</div>');
            document.getElementById("alertS").classList.remove("d-none");
            document.getElementById("tableS").classList.add("d-none");
        }
    });
}

function createSegmentResultRow(json) {
    var openScore = json.ScoreNs;
    var closedScore = json.ScoreEw;
    var scorePresent = json.ScorePresent;
    var showDetailsOpen = openScore.IsEwComplementar && openScore.NsScore !== null && openScore.NsScore.__type === "PointScore:#CalculatingEngine" && openScore.NsScore.Height !== 0;
    var contractOpen;

    if (openScore.IsEwComplementar) {
        var unveiledContract = unveilContract(openScore.NsScore, openScore.Bidding);
        contractOpen = unveiledContract.wrapping ? wrapTooltip(unveiledContract.contract, unveiledContract.shortened) : unveiledContract.contract;
    } else {
        contractOpen = shortenArtificials(unveilContract(openScore.NsScore, openScore.Bidding).contract, unveilContract(openScore.EwScore, openScore.Bidding).contract);
    }

    var tricksOpen = "";

    if (showDetailsOpen) {
        var t = unveilTricks(openScore.NsScore.Overtricks, openScore.Play);
        tricksOpen = t.wrapping ? wrapTooltip(t.tricks, t.shortened) : t.tricks;
    }

    var showDetailsClosed = closedScore.IsEwComplementar && closedScore.NsScore !== null && closedScore.NsScore.__type === "PointScore:#CalculatingEngine" && closedScore.NsScore.Height !== 0;
    var contractClosed;

    if (closedScore.IsEwComplementar) {
        var _unveiledContract = unveilContract(closedScore.NsScore, closedScore.Bidding);

        contractClosed = _unveiledContract.wrapping ? wrapTooltip(_unveiledContract.contract, _unveiledContract.shortened) : _unveiledContract.contract;
    } else {
        contractClosed = shortenArtificials(unveilContract(closedScore.NsScore, closedScore.Bidding).contract, unveilContract(closedScore.EwScore, closedScore.Bidding).contract);
    }

    var tricksClosed = "";

    if (showDetailsClosed) {
        var _t = unveilTricks(closedScore.NsScore.Overtricks, closedScore.Play);

        tricksClosed = _t.wrapping ? wrapTooltip(_t.tricks, _t.shortened) : _t.tricks;
    }

    var boardAsPlayed = json.BoardAsPlayed;
    var board = json.Board;
    var impsHost1 = json.ImpsHost1;
    var impsGuest1 = json.ImpsGuest1;
    var impsHost2 = json.ImpsHost2;
    var impsGuest2 = json.ImpsGuest2;
    var showResultHost1 = !scorePresent ? "" : impsHost1 + impsGuest1 !== resultsShouldSumTo1 ? impsHost1 : impsHost1 < 0 ? "" : impsHost1 === 0 ? "-" : impsHost1;
    var showResultGuest1 = !scorePresent ? "" : impsHost1 + impsGuest1 !== resultsShouldSumTo1 ? impsGuest1 : impsGuest1 < 0 ? "" : impsGuest1 === 0 ? "-" : impsGuest1;
    var showResultHost2 = !scorePresent || !showTwoResults ? "" : impsHost2 + impsGuest2 !== resultsShouldSumTo2 ? impsHost2 : impsHost2 < 0 ? "" : impsHost2 === 0 ? "-" : impsHost2;
    var showResultGuest2 = !scorePresent || !showTwoResults ? "" : impsHost2 + impsGuest2 !== resultsShouldSumTo2 ? impsGuest2 : impsGuest2 < 0 ? "" : impsGuest2 === 0 ? "-" : impsGuest2;
    var roundResultsRow = "<tr>" + "<td rowspan=\"2\" class=\"align-middle text-center text-nowrap d-md-none\">" + "<a href=\"\" data-board-number=\"".concat(board, "\" class=\"boardNumberLink clickable\">").concat(boardAsPlayed, "</a></td>\n") + "<td class=\"align-middle text-center text-nowrap\">".concat(contractOpen, "</td>\n") + "<td class=\"align-middle text-center\">".concat(showDetailsOpen ? unveilDeclarer(openScore.NsScore.Declarer) : "", "</td>\n") + (showLeads ? "<td class=\"align-middle text-center text-nowrap\">".concat(showDetailsOpen ? unveilLead(openScore.NsScore.Lead) : "", "</td>\n") : "") + "<td class=\"align-middle text-right\">".concat(tricksOpen, "</td>\n") + "<td colspan=\"2\" class=\"align-middle ".concat(openScore.NsScore === null || openScore.NsScore.Score > 0 ? "text-left" : openScore.NsScore.Score === 0 ? "text-center" : "text-right", " d-md-none\">").concat(showDetailsOpen ? openScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetailsOpen && openScore.NsScore.Score > 0 ? openScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetailsOpen && openScore.NsScore.Score < 0 ? -1 * openScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-center text-nowrap d-none d-md-table-cell border-3\">" + "<a href=\"\" data-board-number=\"".concat(board, "\" class=\"boardNumberLink clickable\">").concat(boardAsPlayed, "</a></td>\n") + "<td class=\"align-middle text-center text-nowrap d-none d-md-table-cell\">".concat(contractClosed, "</td>\n") + "<td class=\"align-middle text-center d-none d-md-table-cell\">".concat(showDetailsClosed ? unveilDeclarer(closedScore.NsScore.Declarer) : "", "</td>\n") + (showLeads ? "<td class=\"align-middle text-center text-nowrap d-none d-md-table-cell\">".concat(showDetailsClosed ? unveilLead(closedScore.NsScore.Lead) : "", "</td>\n") : "") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(tricksClosed, "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetailsClosed && closedScore.NsScore.Score > 0 ? closedScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetailsClosed && closedScore.NsScore.Score < 0 ? -1 * closedScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-center table-info\">".concat(showResultHost1, "</td>\n") + "<td class=\"align-middle text-center d-none d-md-table-cell table-warning\">".concat(showResultGuest1, "</td>\n") + (showTwoResults ? "<td class=\"align-middle text-center table-info\">".concat(showResultHost2, "</td>\n") : "") + (showTwoResults ? "<td class=\"align-middle text-center d-none d-md-table-cell table-warning\">".concat(showResultGuest2, "</td>\n") : "") + "</tr>\n" + "<tr>\n" + "<td class=\"align-middle text-center text-nowrap d-md-none\">".concat(contractClosed, "</td>\n") + "<td class=\"align-middle text-center d-md-none\">".concat(showDetailsClosed ? unveilDeclarer(closedScore.NsScore.Declarer) : "", "</td>\n") + (showLeads ? "<td class=\"align-middle text-center text-nowrap d-md-none\">".concat(showDetailsClosed ? unveilLead(closedScore.NsScore.Lead) : "", "</td>\n") : "") + "<td class=\"align-middle text-right d-md-none\">".concat(tricksClosed, "</td>\n") + "<td colspan=\"2\" class=\"align-middle ".concat(closedScore.NsScore === null || closedScore.NsScore.Score > 0 ? "text-left" : closedScore.NsScore.Score === 0 ? "text-center" : "text-right", " d-md-none\">").concat(showDetailsClosed ? closedScore.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-center d-md-none table-warning\">".concat(showResultGuest1, "</td>\n") + (showTwoResults ? "<td class=\"align-middle text-center d-md-none table-warning\">".concat(showResultGuest2, "</td>\n") : "") + "</tr>\n";
    return roundResultsRow;
}

function setRoundResultsContentLazy() {
    if (roundResultsRoundLoaded === hashData.round && roundResultsSessionLoaded === hashData.session && hashData.round === oldHash.round && !liveResults) return Promise.resolve();

    if (tournamentType === 2) {
        document.getElementById("oNsNumberColumn").classList.remove("d-md-table-cell");
        document.getElementById("oEwNumberColumn").classList.remove("d-md-table-cell");
        document.getElementById("oNsColumn").classList.add("d-none");
        document.getElementById("oEwColumn").classList.add("d-none");
        document.getElementById("oParticipantsColumn").classList.remove("d-none");
    } else {
        document.getElementById("oNsNumberColumn").classList.add("d-md-table-cell");
        document.getElementById("oEwNumberColumn").classList.add("d-md-table-cell");
        document.getElementById("oNsColumn").classList.remove("d-none");
        document.getElementById("oEwColumn").classList.remove("d-none");
        document.getElementById("oParticipantsColumn").classList.add("d-none");
        document.getElementById("oAdjustmentColumn").classList.add("d-none");
    }

    if (showTwoResults) {
        document.getElementById("oVpPartColumn").classList.remove("d-none");
    } else {
        document.getElementById("oVpPartColumn").classList.add("d-none");
    }

    setHtml("alertO", "");
    setHtml("roundO", "");

    if (!showRoundResults) {
        return Promise.resolve();
    }

    var roundResultJson = "./o".concat(hashData.session, "-").concat(hashData.round, ".json");
    return $.getJSON(roundResultJson).done(function (rr) {
        navigateRoundResults(0, roundResults.indexOf(hashData.session * 1000 + hashData.round) - 2);
        var showAdjustments = rr.Results.some(function (value) {
            return value.AdjustmentsSumNs !== 0 || value.AdjustmentsSumEw !== 0;
        });
        var segmentsMax = Math.max.apply(Math, rr.Results.map(function (o) {
            return o.Segments === null ? 0 : o.Segments.length;
        }));

        if (showAdjustments && tournamentType === 2) {
            document.getElementById("oAdjustmentColumn").classList.remove("d-none");
        } else {
            document.getElementById("oAdjustmentColumn").classList.add("d-none");
        }

        $(".segOL").remove();
        var live = {};

        if (tournamentType === 2) {
            if (segmentsMax > 1) {
                for (var i = segmentsMax; i > 0; i--) {
                    if (i !== 1 && i !== segmentsMax) $('#oThL').find('th').eq(3).after("<th rowspan=\"2\" scope=\"col\" class=\"align-middle text-center segOL\">".concat(language.segment, " 1-").concat(i, "</th>"));
                    live[i - 1] = false;
                    if (liveResults) for (var j = 0; j < rr.Results.length; j++) {
                        if (rr.Results[j].Segments.length >= i && rr.Results[j].Segments[i - 1].Live) {
                            live[i - 1] = true;
                            break;
                        }
                    }
                    $('#oThL').find('th').eq(3).after("<th rowspan=\"2\" scope=\"col\" class=\"align-middle text-center " + "".concat(liveResults && live[i - 1] ? "table-primary" : "", " segOL\">").concat(language.segment, " ").concat(i, "</th>"));
                }
            } else if (segmentsMax === 1) {
                live[0] = false;
                if (liveResults) for (var _j = 0; _j < rr.Results.length; _j++) {
                    if (rr.Results[_j].Segments.length >= 1 && rr.Results[_j].Segments[0].Live) {
                        live[0] = true;
                        break;
                    }
                }

                if (live[0]) {
                    document.getElementById("oImpColumn").classList.add("table-primary");
                } else {
                    document.getElementById("oImpColumn").classList.remove("table-primary");
                }
            }
        }

        var roundResultsHtml = "";
        $.each(rr.Results, function (index, value) {
            roundResultsHtml += createRoundResultRow(value, live, showAdjustments);
        });
        setHtml("rrBody", roundResultsHtml);
        updateLinks();
        var boardsHtml = rr.Boards ? " (".concat(language.boards.toLowerCase(), " ").concat(rr.Boards, ")") : "";
        setHtml("roundO", "".concat(language.roundHL, " ").concat(rr.Round).concat(boardsHtml));
        $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
        document.getElementById("alertO").classList.add("d-none");
        document.getElementById("roundO").classList.remove("d-none");
        document.getElementById("tableO").classList.remove("d-none");
        roundResultsRoundLoaded = hashData.round;
        roundResultsSessionLoaded = hashData.session;
    }).fail(function () {
        if (roundResultsRoundLoaded !== hashData.round || roundResultsSessionLoaded !== hashData.session) {
            setHtml("alertO", '<div class="alert alert-info" role="alert">\n' + 'Fetching round results failed.\n' + 'Those round results might have not been published yet.\n' + '</div>');
            document.getElementById("alertO").classList.remove("d-none");
            document.getElementById("roundO").classList.add("d-none");
            document.getElementById("tableO").classList.add("d-none");
        }
    });
}

function createRoundResultRow(json, live, showAdjustments) {
    if (tournamentType === 2) {
        var participantNs = json.Ns;
        var participantEw = json.Ew;
        var segments = "";

        if (json.Segments.length > 1) {
            $.each(json.Segments, function (index, segment) {
                segments += "<td class=\"align-middle text-center ".concat(liveResults && segment.Live ? "table-primary" : "", "\"") + " style=\"position: relative;\">" + "<a href=\"\" data-session-number=\"".concat(hashData.session, "\" data-round-number=\"").concat(hashData.round, "\"") + " data-segment-number=\"".concat(index, "\" data-table=\"").concat(json.TableFull, "\" class=\"segmentLink clickable\">") + (segment.Started ? showTwoResults ? "".concat(segment.Result1Ns, " | ").concat(segment.Result2Ns, "<br>") + "".concat(segment.Result1Ew, " | ").concat(segment.Result2Ew) : "".concat(segment.Result1Ns, "<br>").concat(segment.Result1Ew) : "") + "</a>".concat(live[index] ? "<div style=\"position: absolute; bottom: 0; right: 3px;\"><small>".concat(segment.BoardsCounted, "</small></div>") : "", "</td>\n");
                if (index !== 0 && index !== json.Segments.length - 1) segments += "<td class=\"align-middle text-center\">" + (segment.Started ? showTwoResults ? "".concat(segment.Result1AfterNs, " | ").concat(segment.Result2AfterNs, "<br>") + "".concat(segment.Result1AfterEw, " | ").concat(segment.Result2AfterEw) : "".concat(segment.Result1AfterNs, "<br>").concat(segment.Result1AfterEw) : "") + "</td>\n";
            });
        }

        var imps = "";

        if (json.Segments.length === 1) {
            imps += "<td class=\"align-middle text-center ".concat(json.Segments[0].Live ? "table-primary" : "", " position-relative\">") + "<a href=\"\" data-session-number=\"".concat(hashData.session, "\" data-round-number=\"").concat(hashData.round, "\"") + " data-segment-number=\"".concat(0, "\" data-table=\"", json.TableFull, "\" class=\"segmentLink clickable\">") + (showTwoResults ? "".concat(json.Sum1Ns, " | ").concat(json.Sum2Ns, "<br>") + "".concat(json.Sum1Ew, " | ").concat(json.Sum2Ew) : "".concat(json.Sum1Ns, "<br>").concat(json.Sum1Ew));
            imps += live[0] ? "<div style=\"position: absolute; bottom: 0; right: 3px;\"><small>".concat(json.Segments[0].BoardsCounted, "</small></div>") : "";
            imps += "</a>";
        } else {
            imps += "<td class=\"align-middle text-center\">" + (showTwoResults ? "".concat(json.Sum1Ns, " | ").concat(json.Sum2Ns, "<br>") + "".concat(json.Sum1Ew, " | ").concat(json.Sum2Ew) : "".concat(json.Sum1Ns, "<br>").concat(json.Sum1Ew));
        }

        imps += "</td>\n";
        var peopleNs = "";

        participantNs._people.forEach(function (person) {
            if (person._pid.__type !== "NoPid:#TournamentStructure") {
                peopleNs += getPlayer(person) + "<br/>";
            }
        });

        var namesNs = "<a href=\"\" data-pair-number=\"".concat(participantNs.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(peopleNs, participantNs._name) + "</a>";
        var peopleEw = "";

        participantEw._people.forEach(function (person) {
            if (person._pid.__type !== "NoPid:#TournamentStructure") {
                peopleEw += getPlayer(person) + "<br/>";
            }
        });

        var namesEw = "<a href=\"\" data-pair-number=\"".concat(participantEw.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(peopleEw, participantEw._name) + "</a>";
        var roundResultsRow = "<tr data-participants=\"|".concat(participantNs.Number, "|").concat(participantEw.Number, "|\">\n") + "<td class=\"align-middle d-none d-md-table-cell text-center\">".concat(json.Table, "</td>\n") + "<td class=\"align-middle text-left\">" + namesNs + "<br>" + namesEw + segments + imps + (showTwoResults ? "<td class=\"align-middle text-center\">".concat(json.Result1Host, "<br>").concat(json.Result1Guest, "</td>\n") : "") + (showAdjustments ? "<td class=\"align-middle text-center\">".concat(json.AdjustmentsSumNs !== 0 ? json.AdjustmentsSumNs : "&nbsp;") + "<br>".concat(json.AdjustmentsSumEw !== 0 ? json.AdjustmentsSumEw : "&nbsp;", "</td>\n") : "") + "<td class=\"align-middle text-center\">".concat(json.ResultNs, "<br>").concat(json.ResultEw, "</td>\n") + "</tr>";
        return roundResultsRow;
    } else {
        var _participantNs = json.Ns;
        var _participantEw = json.Ew;
        var player1 = _participantNs._person1,
            player2 = _participantNs._person2;
        var player3 = _participantEw._person1,
            player4 = _participantEw._person2;

        var _namesNs = getPlayer(player1) + "<br>" + getPlayer(player2);

        var _namesEw = getPlayer(player3) + "<br>" + getPlayer(player4);

        var _roundResultsRow = "<tr data-participants=\"|".concat(_participantNs.Number, "|").concat(_participantEw.Number, "|\">\n") + "<td class=\"align-middle d-none d-md-table-cell text-center\">".concat(json.Table, "</td>\n") + "<td class=\"align-middle d-none d-md-table-cell text-center\">" + "<a href=\"\" data-pair-number=\"".concat(json.Ns.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(json.Ns.Number, "</div></a></td>\n") + "<td class=\"align-middle d-none d-md-table-cell text-center\">" + "<a href=\"\" data-pair-number=\"".concat(json.Ew.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(json.Ew.Number, "</div></a></td>\n") + "<td class=\"align-middle text-right\">".concat(_namesNs, "</td>\n") + "<td class=\"align-middle text-left\">".concat(_namesEw, "</td>\n") + "<td class=\"align-middle text-center\">".concat(json.Sum1Ns.toFixed(2), "-").concat(json.Sum1Ew.toFixed(2), "</td>\n") + "<td class=\"align-middle text-center\">".concat(json.ResultNs.toFixed(2), ":").concat(json.ResultEw.toFixed(2), "</td>\n") + "</tr>";

        return _roundResultsRow;
    }
}

function setHistoryContentLazy() {
    if (tournamentType === 2) {
        document.getElementById("boardHL").classList.add("d-none");
        document.getElementById("lineHL").classList.add("d-none");
        document.getElementById("contractHL").classList.add("d-none");
        document.getElementById("declarerHL").classList.add("d-none");
        document.getElementById("leadHL").classList.add("d-none");
        document.getElementById("tricksHL").classList.add("d-none");
        document.getElementById("scoreHL").classList.add("d-none");
        document.getElementById("currentResultHL").classList.add("d-none");
        document.getElementById("boardHS").classList.add("d-none");
        document.getElementById("boardHS").classList.add("d-none");
        document.getElementById("lineHS").classList.add("d-none");
        document.getElementById("contractHS").classList.add("d-none");
        document.getElementById("declarerHS").classList.add("d-none");
        document.getElementById("leadHS").classList.add("d-none");
        document.getElementById("tricksHS").classList.add("d-none");
        document.getElementById("scoreHS").classList.add("d-none");
        document.getElementById("currentResultHS").classList.add("d-none");
        document.getElementById("hScoreNs").classList.remove("d-md-table-cell");
        document.getElementById("hScoreEw").classList.remove("d-md-table-cell");
        document.getElementById("impHL").classList.remove("d-none");
        document.getElementById("impHS").classList.remove("d-none");
        document.getElementById("rosterDiv").classList.remove("d-none");

        if (showRank) {
            if (showRankOnMobile) {
                document.getElementById("rosterRankColumn").classList.remove("d-md-table-cell");
                document.getElementById("rosterRankColumn").classList.add("d-sm-table-cell");
            } else {
                document.getElementById("rosterRankColumn").classList.remove("d-sm-table-cell");
                document.getElementById("rosterRankColumn").classList.add("d-md-table-cell");
            }
        } else {
            document.getElementById("rosterRankColumn").classList.remove("d-sm-table-cell");
            document.getElementById("rosterRankColumn").classList.remove("d-md-table-cell");
        }

        if (showInfo) {
            if (showInfoOnMobile) {
                document.getElementById("rosterInfoColumn").classList.remove("d-md-table-cell");
                document.getElementById("rosterInfoColumn").classList.add("d-sm-table-cell");
            } else {
                document.getElementById("rosterInfoColumn").classList.remove("d-sm-table-cell");
                document.getElementById("rosterInfoColumn").classList.add("d-md-table-cell");
            }
        } else {
            document.getElementById("rosterInfoColumn").classList.remove("d-sm-table-cell");
            document.getElementById("rosterInfoColumn").classList.remove("d-md-table-cell");
        }

        if (showClubs) {
            document.getElementById("rosterClubColumn").classList.add("d-md-table-cell");
        } else {
            document.getElementById("rosterClubColumn").classList.remove("d-md-table-cell");
        }

        if (showNote) {
            if (showNoteOnMobile) {
                document.getElementById("rosterNoteColumn").classList.remove("d-md-table-cell");
                document.getElementById("rosterNoteColumn").classList.add("d-sm-table-cell");
            } else {
                document.getElementById("rosterNoteColumn").classList.remove("d-sm-table-cell");
                document.getElementById("rosterNoteColumn").classList.add("d-md-table-cell");
            }
        } else {
            document.getElementById("rosterNoteColumn").classList.remove("d-sm-table-cell");
            document.getElementById("rosterNoteColumn").classList.remove("d-md-table-cell");
        }

        if (showDistricts) {
            if (showDistrictsOnMobile) {
                document.getElementById("rosterDistrictColumn").classList.remove("d-md-table-cell");
                document.getElementById("rosterDistrictColumn").classList.add("d-sm-table-cell");
            } else {
                document.getElementById("rosterDistrictColumn").classList.remove("d-sm-table-cell");
                document.getElementById("rosterDistrictColumn").classList.add("d-md-table-cell");
            }
        } else {
            document.getElementById("rosterDistrictColumn").classList.remove("d-sm-table-cell");
            document.getElementById("rosterDistrictColumn").classList.remove("d-md-table-cell");
        }
    } else {
        document.getElementById("boardHL").classList.remove("d-none");
        document.getElementById("lineHL").classList.remove("d-none");
        document.getElementById("contractHL").classList.remove("d-none");
        document.getElementById("declarerHL").classList.remove("d-none");
        document.getElementById("leadHL").classList.remove("d-none");
        document.getElementById("tricksHL").classList.remove("d-none");
        document.getElementById("resultHL").classList.remove("d-none");
        document.getElementById("currentResultHL").classList.remove("d-none");
        document.getElementById("boardHS").classList.remove("d-none");
        document.getElementById("lineHS").classList.remove("d-none");
        document.getElementById("contractHS").classList.remove("d-none");
        document.getElementById("declarerHS").classList.remove("d-none");
        document.getElementById("leadHS").classList.remove("d-none");
        document.getElementById("tricksHS").classList.remove("d-none");
        document.getElementById("scoreHS").classList.remove("d-none");
        document.getElementById("currentResultHS").classList.remove("d-none");
        document.getElementById("hScoreNs").classList.add("d-md-table-cell");
        document.getElementById("hScoreEw").classList.add("d-md-table-cell");
        document.getElementById("impHL").classList.add("d-none");
        document.getElementById("impHS").classList.add("d-none");
        document.getElementById("rosterDiv").classList.add("d-none");

        if (showLeads) {
            document.getElementById("leadHL").classList.remove("d-none");
            document.getElementById("leadHS").classList.remove("d-none");
        } else {
            document.getElementById("leadHL").classList.add("d-none");
            document.getElementById("leadHS").classList.add("d-none");
        }
    }

    if (showTwoResults) {
        document.getElementById("vpHL").classList.remove("d-none");
        document.getElementById("vpHS").classList.remove("d-none");
    } else {
        document.getElementById("vpHL").classList.add("d-none");
        document.getElementById("vpHS").classList.add("d-none");
    }

    if (historyLoaded === hashData.hist && hashData.hist === oldHash.hist && !liveResults) return Promise.resolve();
    setHtml("alertH", "");
    setHtml("pairH", "");

    if (hashData.hist === 0) {
        document.getElementById("alertH").classList.add("d-none");
        document.getElementById("pairH").classList.add("d-none");
        document.getElementById("tableH").classList.add("d-none");
        document.getElementById("formH").classList.remove("d-none");
        document.getElementById("historyFormHeader").classList.remove("d-none");
        return Promise.resolve();
    }

    var histJson = "./h".concat(hashData.hist, ".json");
    return $.getJSON(histJson).done(function (hist) {
        formHistoryHeader(hist.Participant);
        var showAdjustments = hist.Rounds.some(function (value) {
            return value.AdjustmentsSum !== 0;
        });
        var segmentsMax = Math.max.apply(Math, hist.Rounds.map(function (o) {
            return o.SegmentsResults === null ? 0 : o.SegmentsResults.length;
        }));
        if (segmentsMax === 1) segmentsMax = 0;

        if (showAdjustments && tournamentType === 2) {
            document.getElementById("adjHL").classList.remove("d-none");
            document.getElementById("adjHS").classList.remove("d-none");
        } else {
            document.getElementById("adjHL").classList.add("d-none");
            document.getElementById("adjHS").classList.add("d-none");
        }

        $(".segHL").remove();
        $(".segHS").remove();

        if (tournamentType === 2) {
            for (var i = segmentsMax; i > 0; i--) {
                $('#histThL').find('th').eq(8).after("<th rowspan=\"2\" scope=\"col\" class=\"align-middle text-center segHL\">".concat(language.segment, " ").concat(i, "</th>"));
                $('#histThS').find('th').eq(6).after("<th rowspan=\"2\" scope=\"col\" class=\"align-middle text-center segHS\">".concat(language.segment, " ").concat(i, "</th>"));
            }
        }

        if (tournamentType === 2) {
            var people = "";
            var index = 1;

            hist.Participant._people.forEach(function (person) {
                if (person._pid.__type !== "NoPid:#TournamentStructure") {
                    var names = getPlayer(person);
                    var districts = person._state;
                    var clubs = person._club;
                    var note = person._resultNote;
                    var wk = person._wk;
                    var info = person._info;
                    people += "<tr><td>".concat(index, "</td><td class=\"might-be-long-cell\">").concat(names, "</td>") + (showDistricts ? "<td class=\"d-none " + (showDistrictsOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " align-middle text-center text-center\">".concat(districts, "</td>") : "") + (showRank ? "<td class=\"d-none " + (showRankOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " text-center\">" + "".concat(wk, "</td>") : "") + (showInfo ? "<td class=\"d-none " + (showInfoOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " text-center\">" + "".concat(info, "</td>") : "") + (showClubs ? "<td class=\"d-none d-md-table-cell align-middle might-be-long-cell\">".concat(clubs, "</td>") : "") + (showNote ? "<td class=\"d-none " + (showNoteOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " align-middle might-be-long-cell\">".concat(note, "</td>") : "") + "</tr>";
                    index++;
                }
            });

            setHtml("rosterBody", people);
        }

        var columnsSmall = tournamentType === 2 ? segmentsMax + 1 + (showTwoResults ? 1 : 0) + (showAdjustments ? 1 : 0) : 8 - (showLeads ? 0 : 1);
        var columnsBig = tournamentType === 2 ? segmentsMax + 3 + (showTwoResults ? 1 : 0) + (showAdjustments ? 1 : 0) : 11 - (showLeads ? 0 : 1);
        var carryOverHtml = hist.CarryOverSum !== 0 ? "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none\">").concat(language.carryOverPrivateScore, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell\">").concat(language.carryOverPrivateScore, ":</td><td class=\"text-right\">") + "".concat((Math.round(hist.CarryOverSum * 10000) / 10000).toFixed(resultPrecision), "</td></tr>") : "";
        var histHtml = carryOverHtml;
        $.each(hist.Rounds, function (index, value) {
            histHtml += createHistRow(value, showAdjustments, segmentsMax);
        });
        var adjustmentHtml = showAdjustments && tournamentType !== 2 ? "<tr>" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none\">+/-:</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell\">+/-:</td>") + "<td class=\"text-right\">".concat((Math.round(hist.AdjustmentsSum * 10000) / 10000).toFixed(resultPrecision), "</td></tr>") : "";
        var remainingBoardsHtml = hist.RemainingBoardsNumber !== 0 ? "<tr>" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none\">").concat(language.resultRemainingBoards, " ") + "(".concat(hist.RemainingBoardsNumber, "):</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell\">").concat(language.resultRemainingBoards, " ") + "(".concat(hist.RemainingBoardsNumber, "):</td>") + "<td class=\"text-right\">".concat((Math.round(hist.RemainingBoardsScore * 10000) / 10000).toFixed(resultPrecision), "</td></tr>") : "";
        histHtml += adjustmentHtml + remainingBoardsHtml + "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none\">").concat(language.resultPrivateScore, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell\">").concat(language.resultPrivateScore, ":</td>") + "<td class=\"text-right\">".concat((Math.round(hist.Result * 10000) / 10000).toFixed(resultPrecision), "</td></tr>") + "<tr class=\"font-weight-bold\">" + "<td colspan=\"".concat(columnsSmall, "\" class=\"text-right d-md-none\">") + (hist.ClassificationPoints !== 0 ? "<span class=\"mr-3\">".concat(language.classificationColumn, ": ").concat(hist.ClassificationPoints, "</span>") : "") + (hist.CongressPoints !== 0 ? "<span class=\"mr-5\">".concat(language.congressColumn, ": ").concat(hist.CongressPoints, "</span>") : "") + "".concat(language.placePrivateScore, ":</td>") + "<td colspan=\"".concat(columnsBig, "\" class=\"text-right d-none d-md-table-cell\">") + (hist.ClassificationPoints !== 0 ? "<span class=\"mr-3\">".concat(language.classificationColumn, ": ").concat(hist.ClassificationPoints, "</span>") : "") + (hist.CongressPoints !== 0 ? "<span class=\"mr-5\">".concat(language.congressColumn, ": ").concat(hist.CongressPoints, "</span>") : "") + "".concat(language.placePrivateScore, ":</td>") + "<td class=\"text-right\">".concat(hist.Place, "</td></tr>");
        setHtml("hBody", histHtml);
        updateLinks();
        $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
        document.getElementById("alertH").classList.add("d-none");
        document.getElementById("pairH").classList.remove("d-none");
        document.getElementById("tableH").classList.remove("d-none");
        document.getElementById("formH").classList.add("d-none");
        document.getElementById("historyFormHeader").classList.add("d-none");
        historyLoaded = hashData.hist;
    }).fail(function () {
        if (historyLoaded !== hashData.hist) {
            setHtml("alertH", '<div class="alert alert-info" role="alert">\n' + 'Fetching history failed.\n' + 'This history might have not been published yet.\n' + '</div>');
            document.getElementById("alertH").classList.remove("d-none");
            document.getElementById("pairH").classList.add("d-none");
            document.getElementById("tableH").classList.add("d-none");
            document.getElementById("formH").classList.remove("d-none");
            document.getElementById("historyFormHeader").classList.remove("d-none");
        }
    });
}

function formHistoryHeader(participant) {
    switch (tournamentType) {
        case 0:
            {
                setHtml("pairH", "".concat(participant.Number, ". ") + "".concat(participant._person1._firstName, " ").concat(participant._person1._lastName, " - ") + "".concat(participant._person2._firstName, " ").concat(participant._person2._lastName));
                break;
            }

        case 1:
            {
                setHtml("pairH", "".concat(participant.Number, ". ") + "".concat(participant._person._firstName, " ").concat(participant._person._lastName));
                break;
            }

        case 2:
            {
                setHtml("pairH", "".concat(participant.Number, ". ") + "".concat(participant._name));
                break;
            }
    }
}

function createHistRow(histJson, showAdjustments, segmentsMax) {
    var dataParticipants;
    var partner;
    var playersTop;
    var playersLeft;

    switch (tournamentType) {
        case 0:
            {
                playersTop = "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-left clickable\">" + "".concat(histJson.Round, ". ") + "".concat(histJson.Opponents[0].Name, "</div></a>");
                playersLeft = "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-left clickable\">" + "".concat(histJson.Opponents[0].Name, " <span class=\"small\">(").concat(histJson.Opponents[0].Number, ")</span></div></a>");
                dataParticipants = "|".concat(histJson.Opponents[0].Number, "|");
                break;
            }

        case 1:
            {
                partner = histJson.Partner;
                dataParticipants = "|".concat(partner.Number, "|").concat(histJson.Opponents[0].Number, "|").concat(histJson.Opponents[1].Number, "|");
                playersTop = "".concat(histJson.Round, ". * - ") + "<a href=\"\" data-pair-number=\"".concat(partner.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(partner.ShortName, "</div></a> | ") + "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(histJson.Opponents[0].ShortName, "</div></a> - ") + "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[1].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(histJson.Opponents[1].ShortName, "</div></a>");
                playersLeft = "* - <a href=\"\" data-pair-number=\"".concat(partner.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(partner.ShortName, "<span class=\"small\"> (").concat(partner.Number, ")</span></div></a> | ") + "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(histJson.Opponents[0].ShortName, "<span class=\"small\"> (").concat(histJson.Opponents[0].Number, ")</span></div></a> - ") + "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[1].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block align-middle text-left clickable\">" + "".concat(histJson.Opponents[1].ShortName, "<span class=\"small\"> (").concat(histJson.Opponents[1].Number, ")</span></div></a>");
                break;
            }

        case 2:
            {
                playersTop = "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-left clickable\">" + "".concat(histJson.Round, ". ") + "".concat(histJson.Opponents[0].Name, "</div></a>");
                playersLeft = "<a href=\"\" data-pair-number=\"".concat(histJson.Opponents[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-left clickable\">" + "".concat(histJson.Opponents[0].Name, " <span class=\"small\">(").concat(histJson.Opponents[0].Number, ")</span></div></a>");
                dataParticipants = "|".concat(histJson.Opponents[0].Number, "|");
                break;
            }

        default:
            throw "Teams not supported!";
    }

    var historyRow = "";

    switch (tournamentType) {
        case 0:
        case 1:
            {
                historyRow = "<tr class=\"d-md-none font-weight-bold\" data-participants=\"".concat(dataParticipants, "\">") + "<td style=\"text-nowrap\" colspan=\"".concat(9 - (showLeads ? 0 : 1), "\">") + "".concat(playersTop, "</td></tr>") + "<tr data-participants=\"".concat(dataParticipants, "\">\n<td class=\"align-middle text-center d-none d-md-table-cell\" ") + "rowspan=".concat(histJson.Scores.length, ">").concat(histJson.Round, "</td>\n") + "<td class=\"align-middle d-none d-md-table-cell\" rowspan=".concat(histJson.Scores.length, ">") + "".concat(playersLeft, "</td>\n");
                $.each(histJson.Scores, function (index, boardJson) {
                    if (index > 0) {
                        historyRow += "<tr data-participants=\"".concat(dataParticipants, "\">\n");
                    }

                    var showDetails = boardJson.Score.__type === "PointScore:#CalculatingEngine" && boardJson.Score.Height !== 0;
                    var unveiledContract = unveilContract(boardJson.Score, boardJson.Bidding);
                    var contract = unveiledContract.wrapping ? wrapTooltip(unveiledContract.contract, unveiledContract.shortened) : unveiledContract.contract;
                    var tricks = "";

                    if (showDetails) {
                        var t = unveilTricks(boardJson.Score.Overtricks, boardJson.Play);
                        tricks = t.wrapping ? wrapTooltip(t.tricks, t.shortened) : t.tricks;
                    }

                    historyRow += "<td class=\"align-middle text-center\">" + "<a href=\"\" data-board-number=\"".concat(boardJson.Board, "\" class=\"boardNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(boardJson.BoardAsPlayed, "</div></a></td>\n") + "<td class=\"align-middle text-center\">".concat(boardJson.Line, "</td>\n") + "<td class=\"align-middle text-center text-nowrap\">".concat(contract, "</td>\n") + "<td class=\"align-middle text-center\">".concat(showDetails ? unveilDeclarer(boardJson.Score.Declarer) : "", "</td>\n") + (showLeads ? "<td class=\"align-middle text-center text-nowrap\">".concat(showDetails ? unveilLead(boardJson.Score.Lead) : "", "</td>\n") : "") + "<td class=\"align-middle text-right\">".concat(tricks, "</td>\n") + "<td class=\"align-middle ".concat(boardJson.Score.Score > 0 ? "text-left" : boardJson.Score.Score === 0 ? "text-center" : "text-right", " d-md-none\">").concat(showDetails ? boardJson.Score.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetails && boardJson.Score.Score > 0 ? boardJson.Score.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetails && boardJson.Score.Score < 0 ? -1 * boardJson.Score.Score : "", "</td>\n") + "<td class=\"align-middle text-right\">".concat((Math.round(boardJson.Result * 10000) / 10000).toFixed(2), "</td>\n") + "<td class=\"align-middle text-right smaller\">".concat((Math.round(boardJson.ResultAfterScore * 10000) / 10000).toFixed(resultPrecision), "</td>\n</tr>\n");
                });
                break;
            }

        case 2:
            {
                var segmentsCount = segmentsMax > 1 ? segmentsMax : 0;
                historyRow = "<tr class=\"d-md-none font-weight-bold\" data-participants=\"".concat(dataParticipants, "\">") + "<td style=\"text-nowrap\" colspan=\"".concat(2 + (showAdjustments ? 1 : 0) + (showTwoResults ? 1 : 0) + segmentsCount, "\">") + "".concat(playersTop, "</td></tr>") + "<tr data-participants=\"".concat(dataParticipants, "\">\n<td class=\"align-middle text-center d-none d-md-table-cell\" ") + "><a href=\"\" data-session-number=\"".concat(histJson.Session, "\" data-round-number=\"").concat(histJson.Round, "\" class=\"roundResultLink clickable\">").concat(histJson.Round, "</a></td>\n") + "<td class=\"align-middle d-none d-md-table-cell\">" + "".concat(playersLeft, "</td>\n");

                if (histJson.SegmentsResults.length > 1) {
                    $.each(histJson.SegmentsResults, function (index, segment) {
                        historyRow += "<td class=\"align-middle ".concat(segment.Live ? "table-primary" : "", " text-center\">") + "<a href=\"\" data-session-number=\"".concat(histJson.Session, "\" data-round-number=\"").concat(histJson.Round, "\"") + " data-segment-number=\"".concat(index, "\" data-table=\"").concat(histJson.Table, "\" class=\"segmentLink clickable\">") + (showTwoResults ? "".concat(segment.Result1We, " - ").concat(segment.Result1Opponents, " | ") + "".concat(segment.Result2We, " - ").concat(segment.Result2Opponents) : "".concat(segment.Result1We, " - ").concat(segment.Result1Opponents)) + "</a></td>\n";
                    });
                }

                for (var i = 0; i < segmentsMax - histJson.SegmentsResults.length; i++) {
                    historyRow += "<td></td>\n";
                }

                if (histJson.SegmentsResults.length === 1) {
                    historyRow += "<td class=\"align-middle text-center\">" + "<a href=\"\" data-session-number=\"".concat(histJson.Session, "\" data-round-number=\"").concat(histJson.Round, "\"") + " data-segment-number=\"".concat(0, "\" data-table=\"", histJson.Table, "\" class=\"segmentLink clickable\">") + (showTwoResults ? "".concat(histJson.ResultWe1, " - ").concat(histJson.ResultOpponents1, " | ") + "".concat(histJson.ResultWe2, " - ").concat(histJson.ResultOpponents2) : "".concat(histJson.ResultWe1, " - ").concat(histJson.ResultOpponents1)) + "</a></td>\n";
                } else {
                    historyRow += "<td class=\"align-middle text-center\">" + (showTwoResults ? "".concat(histJson.ResultWe1, " - ").concat(histJson.ResultOpponents1, " | ") + "".concat(histJson.ResultWe2, " - ").concat(histJson.ResultOpponents2) : "".concat(histJson.ResultWe1, " - ").concat(histJson.ResultOpponents1)) + "</td>\n";
                }

                if (showTwoResults) {
                    historyRow += "<td class=\"align-middle text-center\">".concat(histJson.Result1) + "</td>\n";
                }

                if (showAdjustments) historyRow += "<td class=\"align-middle text-center\">".concat(histJson.AdjustmentsSum !== 0 ? histJson.AdjustmentsSum : "", "</td>\n");
                historyRow += "<td class=\"align-middle text-center\">".concat(histJson.Result, "</td>\n");
                historyRow += "</tr>";
                break;
            }
    }

    return historyRow;
}

var declarers = ["N", "S", "W", "E"];

function unveilDeclarer(declarer) {
    if (typeof declarer === 'undefined') {
        return "";
    }

    return declarers[declarer];
}

var colorsNames = ["clubs", "diamonds", "hearts", "spades", "notrump"];

function replaceLettersWithImages(str) {
    str = str.replace("C", '<img class="table-img" src="./img/clubs.gif">');
    str = str.replace("D", '<img class="table-img" src="./img/diamonds.gif">');
    str = str.replace("H", '<img class="table-img" src="./img/hearts.gif">');
    str = str.replace("S", '<img class="table-img" src="./img/spades.gif">');
    str = str.replace("NT", '<img class="table-img" src="./img/notrump.gif">');
    return str;
}

function createBiddingOrPlay(biddingOrPlay) {
    var rows = "";
    biddingOrPlay.forEach(function (step) {
        var bids = "";
        step.forEach(function (bid) {
            if (bid === null) bid = "";
            if (bid !== "PASS") bid = replaceLettersWithImages(bid);
            bids += "<td>".concat(bid, "</td>");
        });
        rows += "<tr>".concat(bids, "</tr>");
    });
    return "<table class=\"table table-sm\"><tr><th>W</th><th>N</th><th>E</th><th>S</th></tr>".concat(rows, "</table>");
}

function unveilContract(contract, bidding) {
    if (contract === null) {
        return {
            contract: "",
            wrapping: false,
            shortened: ""
        };
    }

    var unveiled;
    var shouldWrap = false;
    var shortened = "ARB";

    switch (contract.__type) {
        case "PointScore:#CalculatingEngine":
            {
                var height = contract.Height;

                if (!contract.WithContract) {
                    unveiled = contract.Score;
                } else if (height === 0) {
                    unveiled = "PASS";
                } else {
                    var colorImg = "<img class=\"table-img\" src=\"./img/".concat(colorsNames[contract.Denomination], ".gif\">");
                    var doubles = contract.Xx === 0 ? "" : contract.Xx === 1 ? "X" : "XX";
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
            $.each(contract._weightingComponents, function (index, value) {
                if (index > 0) unveiled += ";";
                unveiled += (value._scoreWeightDecimal * 100).toString() + "%";
                unveiled += unveilContract(value.Score, bidding).contract;
            });
            break;

        case "ScoreSewog:#CalculatingEngine":
            shouldWrap = true;
            unveiled = "BO:" + unveilContract(contract.BeforeOffence, bidding).contract + "EAO:" + unveilContract(contract.ExpectedAfterOffence, bidding).contract + "AAO:" + unveilContract(contract.ActualAfterOffence, bidding).contract;
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

var figures = ["J", "Q", "K", "A"];

function unveilLead() {
    var lead = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    if (lead === null || typeof lead === 'undefined') return "";
    var height = lead.CardHeight < 9 ? (lead.CardHeight + 2).toString() : figures[lead.CardHeight - 9];
    var colorImg = "<img class=\"table-img\" src=\"./img/".concat(colorsNames[lead.CardColor], ".gif\">");
    return colorImg + height;
}

function unveilTricks(tricks, play) {
    var unveiled;
    var shouldWrap = false;
    var shortened = "ARB";

    if (typeof tricks === 'undefined' || tricks === null) {
        return "";
    }

    unveiled = tricks === 0 ? "=" : tricks > 0 ? "+" + tricks.toString() : tricks.toString();

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

function addNewContentB(sgIndex) {
    var contentB0 = $("#contentB0").clone();
    contentB0.attr("id", "contentB".concat(sgIndex));
    contentB0.find("#sBody0").attr("id", "sBody".concat(sgIndex));
    contentB0.find("#miniMaxContainer0").attr("id", "miniMaxContainer".concat(sgIndex));
    contentB0.find("#eCards0").attr("id", "eCards".concat(sgIndex));
    contentB0.find("#wCards0").attr("id", "wCards".concat(sgIndex));
    contentB0.find("#nCards0").attr("id", "nCards".concat(sgIndex));
    contentB0.find("#sCards0").attr("id", "sCards".concat(sgIndex));
    contentB0.find("#tricksNsSmall0").attr("id", "tricksNsSmall".concat(sgIndex));
    contentB0.find("#tricksNsLarge0").attr("id", "tricksNsLarge".concat(sgIndex));
    contentB0.find("#tricksEwSmall0").attr("id", "tricksEwSmall".concat(sgIndex));
    contentB0.find("#tricksEwLarge0").attr("id", "tricksEwLarge".concat(sgIndex));
    contentB0.find("#bTitle0").attr("id", "bTitle".concat(sgIndex));
    contentB0.find("#bImage0").attr("id", "bImage".concat(sgIndex));
    contentB0.find("#beginBoardIndicator0").attr("id", "beginBoardIndicator".concat(sgIndex));
    contentB0.find("#copyToClipboardTooltip0").attr("id", "copyToClipboardTooltip".concat(sgIndex));
    contentB0.find("#copyToClipboardLink0").attr("id", "copyToClipboardLink".concat(sgIndex));
    contentB0.find("#copyToClipboardLink".concat(sgIndex)).attr("onclick", "copyBoardToClipboard(".concat(sgIndex, ");"));
    contentB0.find("#fetchBoardByNumber").remove();
    contentB0.find("#noBoardInfo").remove();
    contentB0.appendTo("#tabB");
    var boardToCopy0 = $("#boardToCopy0").clone();
    boardToCopy0.attr("id", "boardToCopy".concat(sgIndex));
    boardToCopy0.find("#miniMaxContainerToCopy0").attr("id", "miniMaxContainerToCopy".concat(sgIndex));
    boardToCopy0.find("#eCardsToCopy0").attr("id", "eCardsToCopy".concat(sgIndex));
    boardToCopy0.find("#wCardsToCopy0").attr("id", "wCardsToCopy".concat(sgIndex));
    boardToCopy0.find("#nCardsToCopy0").attr("id", "nCardsToCopy".concat(sgIndex));
    boardToCopy0.find("#sCardsToCopy0").attr("id", "sCardsToCopy".concat(sgIndex));
    boardToCopy0.find("#tricksNsSmallToCopy0").attr("id", "tricksNsSmallToCopy".concat(sgIndex));
    boardToCopy0.find("#tricksEwSmallToCopy0").attr("id", "tricksEwSmallToCopy".concat(sgIndex));
    boardToCopy0.find("#bTitleToCopy0").attr("id", "bTitleToCopy".concat(sgIndex));
    boardToCopy0.find("#bImageToCopy0").attr("id", "bImageToCopy".concat(sgIndex));
    boardToCopy0.appendTo("#myBody");
}

var vulnerabilities = ["BB", "AB", "BA", "AA"];
var vulnerabilitiesHuman = ["None", "NS", "EW", "All"];

function setBoardContentLazy() {
    if (showLeads) {
        document.getElementById("leadBL").classList.remove("d-none");
        document.getElementById("leadBS").classList.remove("d-none");
    } else {
        document.getElementById("leadBL").classList.add("d-none");
        document.getElementById("leadBS").classList.add("d-none");
    }

    if (tournamentType === 2) {
        document.getElementById("tableBL").classList.remove("d-none");
        document.getElementById("hostBL").classList.remove("d-none");
        document.getElementById("guestBL").classList.remove("d-none");
        document.getElementById("tableBS").classList.remove("d-none");
        document.getElementById("hostBS").classList.remove("d-none");
        document.getElementById("guestBS").classList.remove("d-none");
        document.getElementById("nsBL").classList.add("d-none");
        document.getElementById("ewBL").classList.add("d-none");
        document.getElementById("nsBS").classList.add("d-none");
        document.getElementById("ewBS").classList.add("d-none");
        document.getElementById("resultBL").classList.add("d-none");
        document.getElementById("resultBS").classList.add("d-none");
        document.getElementById("resultNsBL").classList.add("d-none");
        document.getElementById("resultEwBL").classList.add("d-none");
    } else {
        document.getElementById("tableBL").classList.add("d-none");
        document.getElementById("hostBL").classList.add("d-none");
        document.getElementById("guestBL").classList.add("d-none");
        document.getElementById("tableBS").classList.add("d-none");
        document.getElementById("hostBS").classList.add("d-none");
        document.getElementById("guestBS").classList.add("d-none");
        document.getElementById("nsBL").classList.remove("d-none");
        document.getElementById("ewBL").classList.remove("d-none");
        document.getElementById("nsBS").classList.remove("d-none");
        document.getElementById("ewBS").classList.remove("d-none");
        document.getElementById("resultBL").classList.remove("d-none");
        document.getElementById("resultBS").classList.remove("d-none");
        document.getElementById("resultNsBL").classList.remove("d-none");
        document.getElementById("resultEwBL").classList.remove("d-none");
    }

    if (boardLoaded === hashData.board && hashData.board === oldHash.board && !liveResults) return Promise.resolve();
    var foundScoringGroups = boardsScoringGroups.find(function (obj) {
        return obj.Key === hashData.board;
    });
    var scoringGroups = foundScoringGroups !== null && typeof foundScoringGroups !== 'undefined' ? foundScoringGroups.Value : [0];
    return Promise.all(scoringGroups.map(function (sgValue, sgIndex) {
        var boardJson = "./d".concat(hashData.board, "-").concat(sgValue, ".json");
        var scoresJson = "./sg".concat(hashData.board, "-").concat(sgValue, ".json");
        return $.getJSON(scoresJson).done(function (scores) {
            if (sgIndex !== 0 && document.getElementById("contentB".concat(sgIndex)) === null) {
                addNewContentB(sgIndex);
            }

            setHtml("bTitleSecondary", "BOARD ".concat(hashData.board));
            navigateBoard(0, boards.indexOf(hashData.board) - 2);
            var scoresTable = "";
            var lastTable = "";
            $.each(scores.Scores, function (index, value) {
                var showDetails = value.IsEwComplementar && value.NsScore !== null && value.NsScore.__type === "PointScore:#CalculatingEngine" && value.NsScore.Height !== 0;
                var contract;

                if (value.IsEwComplementar) {
                    var unveiledContract = unveilContract(value.NsScore, value.Bidding);
                    contract = unveiledContract.wrapping ? wrapTooltip(unveiledContract.contract, unveiledContract.shortened) : unveiledContract.contract;
                } else {
                    contract = shortenArtificials(unveilContract(value.NsScore, value.Bidding).contract, unveilContract(value.EwScore, value.Bidding).contract);
                }

                var tricks = "";

                if (showDetails) {
                    var t = unveilTricks(value.NsScore.Overtricks, value.Play);
                    tricks = t.wrapping ? wrapTooltip(t.tricks, t.shortened) : t.tricks;
                }

                var dataParticipants = tournamentType === 1 ? "<tr data-participants=\"|".concat(value.ParticipantsNs[0].Number, "|").concat(value.ParticipantsEw[0].Number, "|").concat(value.ParticipantsNs[1].Number, "|").concat(value.ParticipantsEw[1].Number, "|\">\n") : "<tr data-participants=\"|".concat(value.ParticipantsNs[0].Number, "|").concat(value.ParticipantsEw[0].Number, "|\">\n");
                var participantNs;
                var participantEw;
                var table = "";

                switch (tournamentType) {
                    case 0:
                        participantNs = "<td class=\"align-middle text-centere\">" + "<a href=\"\" data-pair-number=\"".concat(value.ParticipantsNs[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsNs[0].Name, value.ParticipantsNs[0].Number), "</div></a></td>\n");
                        participantEw = "<td class=\"align-middle text-center\">" + "<a href=\"\" data-pair-number=\"".concat(value.ParticipantsEw[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsEw[0].Name, value.ParticipantsEw[0].Number), "</div></a></td>\n");
                        break;

                    case 1:
                        participantNs = "<td class=\"align-middle text-center text-nowrap\">" + "<a href=\"\" data-pair-number=\"".concat(value.ParticipantsNs[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsNs[0].Name, value.ParticipantsNs[0].Number), "</div></a> - <a href=\"\" data-pair-number=\"").concat(value.ParticipantsNs[1].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsNs[1].Name, value.ParticipantsNs[1].Number), "</div></a></td>\n");
                        participantEw = "<td class=\"align-middle text-center text-nowrap\">" + "<a href=\"\" data-pair-number=\"".concat(value.ParticipantsEw[0].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsEw[0].Name, value.ParticipantsEw[0].Number), "</div></a> - <a href=\"\" data-pair-number=\"").concat(value.ParticipantsEw[1].Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"d-inline-block text-center clickable\">" + "".concat(wrapTooltip(value.ParticipantsEw[1].Name, value.ParticipantsEw[1].Number), "</div></a></td>\n");
                        break;

                    case 2:
                        if (lastTable !== value.Table) {
                            var rowspan = 1;

                            for (var i = index + 1; i < scores.Scores.length; i++) {
                                if (scores.Scores[i].Table === value.Table) rowspan++;
                            }

                            table = "<td class=\"align-middle text-center\" rowspan=\"".concat(rowspan, "\">") + "<a href=\"\" data-session-number=\"".concat(value.Session, "\" data-round-number=\"").concat(value.Round, "\"") + " data-segment-number=\"".concat(value.Segment, "\" data-table=\"").concat(value.Table, "\" class=\"segmentLink clickable\">") + "".concat(value.Table, "</a>\n</td>\n");
                            participantNs = "<td class=\"align-middle text-centere\" rowspan=\"".concat(rowspan, "\">") + "<a href=\"\" data-pair-number=\"".concat(value.Host.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(wrapTooltip(value.Host.Name, value.Host.Number), "</div></a></td>\n");
                            participantEw = "<td class=\"align-middle text-center\" rowspan=\"".concat(rowspan, "\">") + "<a href=\"\" data-pair-number=\"".concat(value.Guest.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">" + "".concat(wrapTooltip(value.Guest.Name, value.Guest.Number), "</div></a></td>\n");
                            lastTable = value.Table;
                        } else {
                            table = participantNs = participantEw = "";
                        }

                        break;
                }

                scoresTable += dataParticipants + table + participantNs + participantEw + "<td class=\"align-middle text-center text-nowrap\">".concat(contract, "</td>\n") + "<td class=\"align-middle text-center\">".concat(showDetails ? unveilDeclarer(value.NsScore.Declarer) : "", "</td>\n") + (showLeads ? "<td class=\"align-middle text-center text-nowrap\">".concat(showDetails ? unveilLead(value.NsScore.Lead) : "", "</td>\n") : "") + "<td class=\"align-middle text-right\">".concat(tricks, "</td>\n") + "<td class=\"align-middle ".concat(showDetails && value.NsScore.Score > 0 ? "text-left" : showDetails && value.NsScore.Score === 0 ? "text-center" : "text-right", " d-md-none\">").concat(showDetails ? value.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetails && value.NsScore.Score > 0 ? value.NsScore.Score : "", "</td>\n") + "<td class=\"align-middle text-right d-none d-md-table-cell\">".concat(showDetails && value.NsScore.Score < 0 ? -1 * value.NsScore.Score : "", "</td>\n") + (tournamentType !== 2 ? "<td class=\"align-middle text-right\">".concat((Math.round(value.NsResult * 10000) / 10000).toFixed(2), "</td>\n") + "<td class=\"align-middle text-right\">".concat((Math.round(value.EwResult * 10000) / 10000).toFixed(2), "</td>\n") : "") + "</tr>\n";
            });

            if (showBoardAverage) {
                var datum = scores.NsAverage === -scores.EwAverage ? "".concat(scores.NsAverage) : "".concat(scores.NsAverage).concat(-scores.EwAverage);
                scoresTable += "<tr>\n<td colspan=\"6\" class=\"align-middle text-right\">".concat(language.datum, ":</td>\n") + "<td colspan=\"2\" class=\"align-middle text-center d-none d-md-table-cell\">".concat(datum, "</td>\n") + "<td class=\"align-middle text-center d-md-none\">".concat(datum, "</td>\n") + "<td colspan=\"2\" class=\"align-middle text-center\"></td>\n</tr>\n";
            }

            setHtml("sBody".concat(sgIndex), scoresTable);
            updateLinks();
            $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
            document.getElementById("alertB").classList.add("d-none");
            document.getElementById("contentB".concat(sgIndex)).classList.remove("d-none");
            $.getJSON(boardJson).done(function (board) {
                var showMiniMax = board._handRecord.MiniMax !== "";

                if (showMiniMax) {
                    document.getElementById("tricksNsSmall".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("tricksEwSmall".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("tricksNsSmallToCopy".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("tricksEwSmallToCopy".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("tricksNsLarge".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("tricksEwLarge".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("miniMaxContainer".concat(sgIndex)).classList.remove("d-none");
                    document.getElementById("miniMaxContainerToCopy".concat(sgIndex)).classList.remove("d-none");
                } else {
                    document.getElementById("tricksNsSmall".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("tricksEwSmall".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("tricksNsSmallToCopy".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("tricksEwSmallToCopy".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("tricksNsLarge".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("tricksEwLarge".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("miniMaxContainer".concat(sgIndex)).classList.add("d-none");
                    document.getElementById("miniMaxContainerToCopy".concat(sgIndex)).classList.add("d-none");
                }

                var miniMaxHtml = parseMiniMax("Minimax: ".concat(board._handRecord.MiniMax));
                var eCardsHtml = handDescription(board._handRecord.HandE);
                var wCardsHtml = handDescription(board._handRecord.HandW);
                var nCardsHtml = handDescription(board._handRecord.HandN);
                var sCardsHtml = handDescription(board._handRecord.HandS);
                var tricksNs = tricksDescription(board._handRecord, ["N", "S"]);
                var tricksEw = tricksDescription(board._handRecord, ["W", "E"]);
                setHtml("miniMaxContainer".concat(sgIndex), miniMaxHtml);
                setHtml("eCards".concat(sgIndex), eCardsHtml);
                setHtml("wCards".concat(sgIndex), wCardsHtml);
                setHtml("nCards".concat(sgIndex), nCardsHtml);
                setHtml("sCards".concat(sgIndex), sCardsHtml);
                setHtml("tricksNsSmall".concat(sgIndex), tricksNs);
                setHtml("tricksNsLarge".concat(sgIndex), tricksNs);
                setHtml("tricksEwSmall".concat(sgIndex), tricksEw);
                setHtml("tricksEwLarge".concat(sgIndex), tricksEw);
                setHtml("miniMaxContainerToCopy".concat(sgIndex), miniMaxHtml);
                setHtml("eCardsToCopy".concat(sgIndex), eCardsHtml);
                setHtml("wCardsToCopy".concat(sgIndex), wCardsHtml);
                setHtml("nCardsToCopy".concat(sgIndex), nCardsHtml);
                setHtml("sCardsToCopy".concat(sgIndex), sCardsHtml);
                setHtml("tricksNsSmallToCopy".concat(sgIndex), tricksNs);
                setHtml("tricksEwSmallToCopy".concat(sgIndex), tricksEw);
                var handRec = board._handRecord;
                setHtml("bTitle".concat(sgIndex), "<h1 class=\"mb-0\">".concat(board._numberAsPlayed, "</h1>").concat(vulnerabilitiesHuman[handRec.Vulnerability], " / ").concat(declarers[handRec.Dealer], "\n"));
                setHtml("bImage".concat(sgIndex), "<img class=\"img-fluid\" src=\"./img/board".concat(vulnerabilities[handRec.Vulnerability]) + "".concat(declarers[handRec.Dealer], ".png\">"));
                setHtml("bTitleToCopy".concat(sgIndex), "<h1 class=\"mb-0\">".concat(board._numberAsPlayed, "</h1>").concat(vulnerabilitiesHuman[handRec.Vulnerability], " / ").concat(declarers[handRec.Dealer], "\n"));
                setHtml("bImageToCopy".concat(sgIndex), "<img class=\"img-fluid\" width=\"77px\" src=\"./img/board".concat(vulnerabilities[handRec.Vulnerability]) + "".concat(declarers[handRec.Dealer], "boardToCopy.png\">"));
                document.getElementById("noBoardInfo").classList.add("d-none");
                $.each(document.getElementsByClassName("boardInfo"), function (index, value) {
                    value.classList.remove("d-none");
                });
            }).fail(function () {
                document.getElementById("noBoardInfo").classList.remove("d-none");
                $.each(document.getElementsByClassName("boardInfo"), function (index, value) {
                    value.classList.add("d-none");
                });
            });

            if (boardLoaded !== hashData.board) {
                boardLoaded = hashData.board;
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = Array.from(Array(5).keys()).filter(function (o) {
                        return scoringGroups.indexOf(o) < 0;
                    })[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var x = _step.value;
                        var contentToRemove = document.getElementById("contentB".concat(x));
                        if (contentToRemove !== null && typeof contentToRemove !== 'undefined') contentToRemove.classList.add("d-none");
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return != null) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        }).fail(function () {
            if (sgIndex === 0 && boardLoaded !== hashData.board) {
                setHtml("alertB", '<div class="alert alert-info" role="alert">\n' + 'Fetching board failed.\n' + 'This board might have not been published yet.\n' + '</div>');
                document.getElementById("alertB").classList.remove("d-none");
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = Array(5).keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var x = _step2.value;
                        var contentToRemove = document.getElementById("contentB".concat(x));
                        if (contentToRemove !== null && typeof contentToRemove !== 'undefined') contentToRemove.classList.add("d-none");
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        });
    }));
}

function copyBoardToClipboard(index) {
    var copyText = document.getElementById("boardToCopy".concat(index));
    copyText.classList.remove("d-none");
    window.getSelection().removeAllRanges();
    var range = document.createRange();
    range.selectNode(copyText);
    window.getSelection().addRange(range);
    document.execCommand("copy");
    copyText.classList.add("d-none");
}

var shortable = {
    'AM': 'M',
    'AP': 'P',
    'AA': 'A',
    'ARB0': '0'
};

function shortenArtificials(contract1, contract2) {
    if (contract1 in shortable && contract2 in shortable) return "A".concat(shortable[contract1]).concat(shortable[contract2]);
    if (contract1 === "SIT-OUT" && contract2 === "SIT-OUT") return wrapTooltip(contract1);
    return wrapTooltip("".concat(contract1, "|").concat(contract2));
}

function wrapTooltip(content) {
    var shorter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "ARB";
    var contentEscaped = content.replace(/"/g, "'");
    var result = "<span class=\"new-tooltip\" data-toggle=\"tooltip\" data-placement=\"bottom\"" + " data-html=\"true\" title=\"".concat(contentEscaped, "\">").concat(shorter, "</span>");
    return result;
}

var colorsPics = {
    "nt": "<img class=\"table-img\" src=\"./img/notrump.gif\">",
    "s": "<img class=\"table-img\" src=\"./img/spades.gif\">",
    "h": "<img class=\"table-img\" src=\"./img/hearts.gif\">",
    "d": "<img class=\"table-img\" src=\"./img/diamonds.gif\">",
    "c": "<img class=\"table-img\" src=\"./img/clubs.gif\">"
};

function parseMiniMax(miniMax) {
    if (miniMax === "PASS") return miniMax;
    var miniMaxNew;
    $.each(colorsPics, function (k, v) {
        miniMaxNew = miniMax.replace(k, v);
        if (miniMaxNew.localeCompare(miniMax) === -1) return false;
        return true;
    });
    return miniMaxNew;
}

function handDescription(handMap) {
    return "<img class=\"table-img\" src=\"./img/spades.gif\">".concat(handMap.Spades, "<br>\n") + "<img class=\"table-img\" src=\"./img/hearts.gif\">".concat(handMap.Hearts, "<br>\n") + "<img class=\"table-img\" src=\"./img/diamonds.gif\">".concat(handMap.Diamonds, "<br>\n") + "<img class=\"table-img\" src=\"./img/clubs.gif\">".concat(handMap.Clubs);
}

function tricksDescription(boardMap, hands) {
    var tricks = "<table class=\"table table-sm mb-0\">\n" + '<thead>\n' + '<tr>\n' + '<th scope="col" class="align-middle text-center"></th>\n' + '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/notrump.gif"></th>\n' + '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/spades.gif"></th>\n' + '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/hearts.gif"></th>\n' + '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/diamonds.gif"></th>\n' + '<th scope="col" class="align-middle text-center"><img class="table-img" src="./img/clubs.gif"></th>\n' + '</tr>\n' + '</thead>\n' + '<tbody>\n';
    $.each(hands, function (i, value) {
        var index = "TricksFrom" + value;
        tricks += "<tr>\n" + "<td>".concat(value, "</td>\n") + "<td class=\"text-center\">".concat(boardMap[index].Nt, "</td>\n") + "<td class=\"text-center\">".concat(boardMap[index].Spades, "</td>\n") + "<td class=\"text-center\">".concat(boardMap[index].Hearts, "</td>\n") + "<td class=\"text-center\">".concat(boardMap[index].Diamonds, "</td>\n") + "<td class=\"text-center\">".concat(boardMap[index].Clubs, "</td>\n") + "</tr>\n";
    });
    tricks += "</tbody>\n</table>\n";
    return tricks;
}

function setFollowed() {
    var followed = hashData.followed;
    if (followed === 0) return;
    var interesting = $("tr[data-participants~='".concat(followed, "']"));
    console.log(interesting);
}

function loadResults(whereToScroll) {
    var resultsJson = "./results.json";

    if (showClassification) {
        document.getElementById("classificationColumn").classList.add("d-sm-table-cell");
    } else {
        document.getElementById("classificationColumn").classList.remove("d-sm-table-cell");
    }

    if (showCongress) {
        document.getElementById("congressColumn").classList.add("d-sm-table-cell");
    } else {
        document.getElementById("congressColumn").classList.remove("d-sm-table-cell");
    }

    if (showAdjustments) {
        document.getElementById("adjustmentColumn").classList.add("d-sm-table-cell");
    } else {
        document.getElementById("adjustmentColumn").classList.remove("d-sm-table-cell");
    }

    if (showCarryOver) {
        document.getElementById("carryOverColumn").classList.add("d-md-table-cell");
        document.getElementById("sessionResultColumn").classList.add("d-md-table-cell");
    } else {
        document.getElementById("carryOverColumn").classList.remove("d-md-table-cell");
        document.getElementById("sessionResultColumn").classList.remove("d-md-table-cell");
    }

    if (showRank) {
        if (showRankOnMobile) {
            document.getElementById("rankColumn").classList.remove("d-md-table-cell");
            document.getElementById("rankColumn").classList.add("d-sm-table-cell");
        } else {
            document.getElementById("rankColumn").classList.remove("d-sm-table-cell");
            document.getElementById("rankColumn").classList.add("d-md-table-cell");
        }
    } else {
        document.getElementById("rankColumn").classList.remove("d-sm-table-cell");
        document.getElementById("rankColumn").classList.remove("d-md-table-cell");
    }

    if (showInfo) {
        if (showInfoOnMobile) {
            document.getElementById("infoColumn").classList.remove("d-md-table-cell");
            document.getElementById("infoColumn").classList.add("d-sm-table-cell");
        } else {
            document.getElementById("infoColumn").classList.remove("d-sm-table-cell");
            document.getElementById("infoColumn").classList.add("d-md-table-cell");
        }
    } else {
        document.getElementById("infoColumn").classList.remove("d-sm-table-cell");
        document.getElementById("infoColumn").classList.remove("d-md-table-cell");
    }

    if (showClubs) {
        document.getElementById("clubColumn").classList.add("d-md-table-cell");
    } else {
        document.getElementById("clubColumn").classList.remove("d-md-table-cell");
    }

    if (showNote) {
        if (showNoteOnMobile) {
            document.getElementById("noteColumn").classList.remove("d-md-table-cell");
            document.getElementById("noteColumn").classList.add("d-sm-table-cell");
        } else {
            document.getElementById("noteColumn").classList.remove("d-sm-table-cell");
            document.getElementById("noteColumn").classList.add("d-md-table-cell");
        }
    } else {
        document.getElementById("noteColumn").classList.remove("d-sm-table-cell");
        document.getElementById("noteColumn").classList.remove("d-md-table-cell");
    }

    if (showDistricts) {
        if (showDistrictsOnMobile) {
            document.getElementById("districtColumn").classList.remove("d-md-table-cell");
            document.getElementById("districtColumn").classList.add("d-sm-table-cell");
        } else {
            document.getElementById("districtColumn").classList.remove("d-sm-table-cell");
            document.getElementById("districtColumn").classList.add("d-md-table-cell");
        }
    } else {
        document.getElementById("districtColumn").classList.remove("d-sm-table-cell");
        document.getElementById("districtColumn").classList.remove("d-md-table-cell");
    }

    if (showRewards) {
        document.getElementById("rewardColumn").classList.add("d-md-table-cell");
    } else {
        document.getElementById("rewardColumn").classList.remove("d-md-table-cell");
    }

    if (showRewardsDescriptions) {
        document.getElementById("descriptionColumn").classList.add("d-md-table-cell");
    } else {
        document.getElementById("descriptionColumn").classList.remove("d-md-table-cell");
    }

    if (showVpTable) {
        document.getElementById("vpTableLink").classList.remove("d-none");
        document.getElementById("vpTableLinkHL").classList.remove("d-none");
        document.getElementById("vpTableLinkHS").classList.remove("d-none");
    } else {
        document.getElementById("vpTableLink").classList.add("d-none");
        document.getElementById("vpTableLinkHL").classList.add("d-none");
        document.getElementById("vpTableLinkHS").classList.add("d-none");
    }

    $.getJSON(resultsJson).done(function (results) {
        var resultsRows = "";
        var previousPlace = 0;
        var previousGroup = null;
        $.each(results.Results, function (index, value) {
            var participant = value.Participant;
            var names;
            var districts;
            var clubs;
            var note;
            var wk;
            var info;

            switch (tournamentType) {
                case 0:
                    {
                        var player1 = participant._person1,
                            player2 = participant._person2;
                        recordPlayer(player1, participant.Number);
                        recordPlayer(player2, participant.Number);
                        names = getPlayer(player1) + "<br>" + getPlayer(player2);
                        districts = player1._state === player2._state ? player1._state : player1._state + "<br>" + player2._state;

                        if (districts.endsWith(">")) {
                            districts += "&nbsp";
                        }

                        clubs = player1._club === player2._club ? player1._club : player1._club + "<br>" + player2._club;

                        if (clubs.endsWith(">")) {
                            clubs += "&nbsp";
                        }

                        note = player1._rsultNote === player2._resultNote ? player1._resultNote : player1._resultNote + "<br>" + player2._resultNote;

                        if (note.endsWith(">")) {
                            note += "&nbsp";
                        }

                        var wk1 = getWk(player1);
                        var wk2 = getWk(player2);
                        wk = "".concat(wk1, "<br>").concat(wk2);

                        if (wk.endsWith(">")) {
                            wk += "&nbsp";
                        }

                        info = "".concat(player1._info, "<br>").concat(player2._info);
                        break;
                    }

                case 1:
                    {
                        var player = participant._person;
                        recordPlayer(participant._person, participant.Number);
                        names = getPlayer(player);
                        districts = player._state;
                        clubs = player._club;
                        note = player._resultNote;
                        wk = player._wk;
                        info = player._info;
                        break;
                    }

                case 2:
                    {
                        var people = "";

                        participant._people.forEach(function (person) {
                            if (person._pid.__type !== "NoPid:#TournamentStructure") {
                                recordPlayer(person, participant.Number);
                                people += getPlayer(person) + "<br/>";
                            }
                        });

                        names = "<a href=\"\" data-pair-number=\"".concat(participant.Number, "\" class=\"pairNumberLink clickable\">") + wrapTooltip(people, participant._name) + "</a>";
                        break;
                    }
            }

            var clPoints = showClassification ? value.Reward._classificationPoints > 0 ? value.Reward._classificationPoints : "" : "";
            var coPoints = showCongress ? value.Reward._congressPoints > 0 ? value.Reward._congressPoints : "" : "";
            var adju = showAdjustments ? value.AdjustmentsSum !== 0 ? (Math.round(value.AdjustmentsSum * 10000) / 10000).toFixed(resultPrecision) : "" : "";
            var carryOver = showCarryOver ? value.CarryOverSum !== 0 ? (Math.round(value.CarryOverSum * 10000) / 10000).toFixed(resultPrecision) : "" : "";
            var session = showCarryOver ? (Math.round(value.SessionSum * 10000) / 10000).toFixed(resultPrecision) : "";

            if (value.ParticipantGroup !== previousGroup) {
                resultsRows += "<tr><td class=\"align-middle text-center\" colspan=\"100\"><b>" + "".concat(value.ParticipantGroup, "</b></td></tr>");
            }

            resultsRows += "<tr data-participants=\"|".concat(participant.Number, "|\">") + "<td class=\"align-middle text-center\">".concat(value.Place === previousPlace && value.ParticipantGroup === previousGroup ? "" : value.Place, "</td>") + "<td class=\"align-middle\">" + "<a href=\"\" data-pair-number=\"".concat(participant.Number, "\" class=\"pairNumberLink clickable\">") + "<div class=\"align-middle text-center clickable\">".concat(participant.Number, "</div></a></td>") + "<td class=\"might-be-long-cell\">".concat(names, "</td>") + (showDistricts ? "<td class=\"d-none " + (showDistrictsOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " align-middle text-center text-center\">".concat(districts, "</td>") : "") + (showRank ? "<td class=\"d-none " + (showRankOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " text-center\">" + "".concat(wk, "</td>") : "") + (showInfo ? "<td class=\"d-none " + (showInfoOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " text-center\">" + "".concat(info, "</td>") : "") + (showClubs ? "<td class=\"d-none d-md-table-cell align-middle might-be-long-cell\">".concat(clubs, "</td>") : "") + (showNote ? "<td class=\"d-none " + (showNoteOnMobile ? "d-sm-table-cell" : "d-md-table-cell") + " align-middle might-be-long-cell\">".concat(note, "</td>") : "") + (showCarryOver ? "<td class=\"align-middle text-center d-none d-md-table-cell\">".concat(carryOver, "</td>") : "") + (showAdjustments ? "<td class=\"align-middle text-center d-none d-sm-table-cell\">".concat(adju, "</td>") : "") + (showCarryOver ? "<td class=\"align-middle text-center d-none d-md-table-cell\">".concat(session, "</td>") : "") + "<td class=\"text-center align-middle\">".concat((Math.round(value.Result._pointsDecimal * 10000) / 10000).toFixed(resultPrecision), "</td>") + (showClassification ? "<td class=\"align-middle text-center d-none d-sm-table-cell\">".concat(clPoints, "</td>") : "") + (showCongress ? "<td class=\"align-middle text-center d-none d-sm-table-cell\">".concat(coPoints, "</td>") : "") + (showRewardsDescriptions ? "<td class=\"d-none d-md-table-cell align-middle\">".concat(value.Reward._description, "</td>") : "") + (showRewards ? "<td class=\"d-none text-right d-md-table-cell align-middle\">".concat(value.Reward._reward, "</td>") : "") + (liveResults ? "<td class=\"align-middle text-center small\">".concat(value.CountedBoards, "</td>") : "") + "</tr>";
            previousPlace = value.Place;
            previousGroup = value.ParticipantGroup;
        });
        document.getElementById("alertR").classList.add("d-none");
        document.getElementById("contentR").classList.remove("d-none");
        setHtml("rBody", resultsRows);

        if (results.PeopleParticipated.length > 0) {
            var peopleParticipated = language.peopleParticipated + "<br>";
            $.each(results.PeopleParticipated, function (index, value) {
                peopleParticipated += getPlayer(value) + ", ";
            });
            peopleParticipated.substring(0, peopleParticipated.length - 2);
            setHtml("peopleParticipated", peopleParticipated);
            document.getElementById("peopleParticipated").classList.remove("d-none");
        } else {
            document.getElementById("peopleParticipated").classList.add("d-none");
        }

        updateLinks();
        resultsLoaded = true;
        $("tr[data-participants*='|".concat(hashData.followed, "|']")).addClass("table-primary");
        safeScroll(whereToScroll);
    }).fail(function () {
        if (!resultsLoaded) {
            document.getElementById("alertR").classList.remove("d-none");
            document.getElementById("contentR").classList.add("d-none");
            setHtml("alertR", '<div class="alert alert-info" role="alert">\n' + 'Fetching results failed.\n' + 'They might have not been published yet.\n' + '</div>');
        }
    });
}

function loadVpTable() {
    if (!showVpTable) {
        return;
    }

    var vpJson = "./vp.json";
    $.getJSON(vpJson).done(function (vpTable) {
        var vpTableRows1 = "";
        var vpTableRows2 = "";
        var vpLength = vpTable.length;

        for (var i = 0; i < ((vpLength + 1) / 2 | 2); i++) {
            vpTableRows1 += "<tr><td class=\"align-middle text-center\">".concat(i, "</td>") + "<td class=\"align-middle text-center\">".concat(vpTable[i], "</td></tr>");
        }

        ;

        for (var _i5 = (vpLength + 1) / 2 | 2; _i5 < vpLength; _i5++) {
            vpTableRows2 += "<tr><td class=\"align-middle text-center\">".concat(_i5 + (vpLength - 1 === _i5 ? "+" : ""), "</td>") + "<td class=\"align-middle text-center\">".concat(vpTable[_i5], "</td></tr>");
        }

        ;
        setHtml("contentVpBody1", vpTableRows1);
        setHtml("contentVpBody2", vpTableRows2);
    });
}

function safeScroll(whereToScroll) {
    // BE CAREFUL! THIS IS A SOPHISTICATED FUNCTION
    if (!(typeof whereToScroll === "undefined")) {
        if (whereToScroll < 0) {
            var offset = $("#contentR tr[data-participants*='|".concat(hashData.followed, "|']")).offset().top + 'px';
            $("html, body").animate({
                scrollTop: offset
            });
        } else {
            $("html, body").animate({
                scrollTop: "".concat(whereToScroll)
            });
        }
    }
}

function isElementInViewport(el) {
    var rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= $(window).height();
}

function getWk(description) {
    if (description._pid.__type === "RealPid:#TournamentStructure" && description._pid.Number !== 0) {
        return description._wk;
    } else if (description._wk !== 0) return description._wk;

    return "";
}

function getPlayer(description) {
    if (description === null) {
        return "";
    }

    var player = description._firstName + " " + description._lastName;

    if (description._pid.__type === "RealPid:#TournamentStructure" && description._pid.Number !== 0) {
        player = "<a class=\"clickable\" target=\"_blank\"" + "href=\"https://msc.com.pl/cezar/?p=21&pid=".concat(description._pid.Number, "\">") + player + "</a>";
    }

    return player;
}

function recordPlayer(player, participant) {
    if (player._pid.__type === "RealPid:#TournamentStructure" && player._pid.Number !== 0) {
        playerToParticipant[player._pid.Number] = participant;
    }
}

function unfollowPlayer() {
    $("tr[data-participants*='|".concat(hashData.followed, "|']")).removeClass("table-primary");
    hashData.followed = 0;
    updateHashLink();
}

function followPlayer(whereFrom) {
    var query = document.getElementById(whereFrom).value;
    var participant = queryToParticipant(Number(query));

    if (participant === -1) {
        alert("This pair/player number does not appear in this tournament");
    } else {
        $("tr[data-participants*='|".concat(hashData.followed, "|']")).removeClass("table-primary");

        if (hashData.hist === 0) {
            hashData.hist = participant;
        }

        hashData.followed = participant;
        hashData.mobileView = "R";
        hashData.leftView = "R";
        window.Cookies.set('fresh-followed', -1);
        updateHashLink();
    }

    ;
} // takes participant or player number. Returns participant number or -1
// if this is incorrect query


function queryToParticipant(query) {
    if (query < 1000) {
        if (participants.includes(query)) return query; else return -1;
    } else {
        if (query in playerToParticipant) return playerToParticipant[query]; else return -1;
    }
}

function fetchHistory() {
    var query = document.getElementById("historyInput").value;
    var participant = queryToParticipant(Number(query));

    if (participant === -1) {
        alert("This pair/player number does not appear in this tournament");
    } else {
        showPairHistory(participant);
    }

    ;
}

function navigateBoard(direction, forceIndex) {
    var newIndex = forceIndex;

    if (typeof newIndex === 'undefined') {
        var oldBegin = Number(getHtml("beginBoardIndicator0"));
        var oldIndex = boards.indexOf(oldBegin);
        newIndex = oldIndex + direction;
    }

    if (newIndex > boards.length - 5) {
        newIndex = boards.length - 5;
    }

    if (newIndex < 0) {
        newIndex = 0;
    }

    $(".boardNavUp").each(function (index, value) {
        $(value).find(".boardNav").each(function (index, value) {
            var boardNumber = boards.length > newIndex + index ? boards[newIndex + index].toString() : "";
            value.innerHTML = boardNumber;
            var newHash = changeHash(boardStart, boardEnd, boardNumber.padStart(3, "0"));
            $(value).attr("href", newHash);
        });
    });
    $(".boardNavDown").each(function (index, value) {
        $(value).find(".boardNav").each(function (index, value) {
            var boardNumber = boards.length > newIndex + index ? boards[newIndex + index].toString() : "";
            value.innerHTML = boardNumber;
            var newHash = changeHash(boardStart, boardEnd, boardNumber.padStart(3, "0"));
            $(value).attr("href", newHash);
        });
    });
}

function navigateRoundResults(direction, forceIndex) {
    var newIndex = forceIndex;

    if (typeof newIndex === 'undefined') {
        var oldRoundBegin = Number(getHtml("beginRoundResultIndicator"));
        var oldSessionBegin = Number($("#beginRoundResultIndicator").attr("data-session"));
        var oldIndex = roundResults.indexOf(oldSessionBegin * 1000 + oldRoundBegin);
        newIndex = oldIndex + direction;
    }

    if (newIndex > roundResults.length - 5) {
        newIndex = roundResults.length - 5;
    }

    if (newIndex < 0) {
        newIndex = 0;
    }

    $("#roundResultNavUp .boardNav").each(function (index, value) {
        updateRoundResultLink(newIndex, index, value);
    });
    $("#roundResultNavDown .boardNav").each(function (index, value) {
        updateRoundResultLink(newIndex, index, value);
    });
}

function setHtml(id, html) {
    document.getElementById(id).innerHTML = html;
}

function getHtml(id) {
    return document.getElementById(id).innerHTML;
}

function setBoardInput() {
    var boardNumber = Number(document.getElementById('fetchBoardInput').value);

    if (!boards.includes(boardNumber)) {
        alert("This board does not appear in this tournament");
        return;
    }

    showBoard(boardNumber);
}

function showPairHistory(number) {
    hashData.leftView = "H";
    hashData.mobileView = "H";
    hashData.hist = number;
    updateHashLink();
}

function showBoard(number) {
    hashData.mobileView = "B";
    hashData.board = number;
    updateHashLink();
}

function updateHashLink() {
    $('[data-toggle="tooltip"]').tooltip("hide");
    window.location.hash = getHashLink();
}

function getHashLink() {
    return "#" + hashData.followed.toString().padStart(3, "0") + hashData.leftView + hashData.mobileView + hashData.hist.toString().padStart(3, "0") + hashData.board.toString().padStart(3, "0") + hashData.session.toString().padStart(3, "0") + hashData.round.toString().padStart(3, "0") + hashData.segment.toString().padStart(3, "0") + hashData.table.padStart(6, "0");
}