import { global } from './vars.js';
import { loc } from './locale.js';

export const MOBILE_MAX_WIDTH = 430;

let mobileMode = false;
let activeSheet = null;
let inspectorHasContent = false;
let inspectorExpanded = true;

const panelAnchors = {};

export function isMobileViewport(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w > MOBILE_MAX_WIDTH){
        return false;
    }
    return h >= w;
}

export function isTouchDevice(){
    return ('ontouchstart' in document.documentElement) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export function isTouchMode(){
    return isTouchDevice() && global.settings.touch;
}

export function initMobileTouch(){
    if (!global.settings.hasOwnProperty('touchManual')){
        global.settings.touchManual = false;
    }
    if (!global.settings.touchManual && isMobileViewport() && isTouchDevice()){
        global.settings.touch = true;
    }
}

export function initMobileUI(){
    if ($('#mobileNav').length === 0){
        appendMobileChrome();
        bindMobileEvents();
    }
    applyMobileLayout();
}

function appendMobileChrome(){
    $('body').append(`
        <div id="mobileResourceDock" class="mobile-resource-dock" aria-label="${loc('tab_resources')}">
            <div id="mobileDockRace" class="mobile-dock-race"></div>
            <div id="mobileDockResources" class="mobile-dock-resources"></div>
        </div>
        <div id="mobileInspector" class="mobile-inspector" aria-hidden="true">
            <button type="button" class="mobile-inspector-header" aria-expanded="true">
                <span class="mobile-inspector-title"></span>
                <span class="mobile-inspector-toggle" aria-hidden="true">&#9662;</span>
            </button>
            <div id="mobileInspectorBody" class="mobile-inspector-body pop-desc has-background-light has-text-dark"></div>
        </div>
        <div id="mobileNav" class="mobile-nav" aria-label="Mobile navigation">
            <button type="button" class="mobile-nav-btn" data-sheet="log" aria-label="${loc('message_log')}">
                <span class="mobile-nav-label">${loc('message_log')}</span>
            </button>
            <button type="button" class="mobile-nav-btn" data-sheet="queue" aria-label="${loc('queue')}">
                <span class="mobile-nav-label">${loc('queue')}</span>
            </button>
            <button type="button" class="mobile-nav-btn" data-sheet="play" aria-label="${loc('game_play')}">
                <span class="mobile-nav-label">${loc('game_play')}</span>
            </button>
        </div>
        <div id="mobileSheetBackdrop" class="mobile-sheet-backdrop" aria-hidden="true"></div>
        <div id="mobileSheets">
            <div id="mobileSheetLog" class="mobile-sheet" data-sheet="log" aria-hidden="true">
                <div class="mobile-sheet-header">${loc('message_log')}</div>
                <div id="mobilePanelLog" class="mobile-sheet-body mobile-panel-log"></div>
            </div>
            <div id="mobileSheetQueue" class="mobile-sheet" data-sheet="queue" aria-hidden="true">
                <div class="mobile-sheet-header">${loc('queue')}</div>
                <div id="mobilePanelQueue" class="mobile-sheet-body mobile-panel-queue"></div>
            </div>
            <div id="mobileSheetTop" class="mobile-sheet mobile-sheet-top" data-sheet="top" aria-hidden="true">
                <div class="mobile-sheet-header">${loc('year')}</div>
                <div id="mobileTopDetail" class="mobile-sheet-body mobile-panel-top"></div>
            </div>
        </div>
    `);
}

function bindMobileEvents(){
    $('#mobileNav').on('click', '.mobile-nav-btn', function(){
        const sheet = $(this).data('sheet');
        if (sheet === 'play'){
            closeMobileSheet();
            return;
        }
        toggleMobileSheet(sheet);
    });

    $('#mobileSheetBackdrop').on('click', closeMobileSheet);

    $('#topBar').on('click', '.mobile-top-expand', function(e){
        e.preventDefault();
        e.stopPropagation();
        toggleMobileSheet('top');
    });

    $('#mobileInspector').on('click', '.mobile-inspector-header', function(e){
        e.preventDefault();
        inspectorExpanded = $('#mobileInspector').toggleClass('expanded').hasClass('expanded');
        $(this).attr('aria-expanded', inspectorExpanded ? 'true' : 'false');
        syncInspectorLayout();
    });

    let resizeTimer;
    $(window).on('resize orientationchange', function(){
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(applyMobileLayout, 150);
    });
}

function stashAndMove(selector, targetSelector){
    const $el = $(selector);
    const $target = $(targetSelector);
    if ($el.length === 0 || $target.length === 0){
        return;
    }
    if (!panelAnchors[selector]){
        panelAnchors[selector] = {
            parent: $el.parent(),
            next: $el.next().length ? $el.next()[0] : null,
        };
    }
    $el.detach().appendTo($target);
}

function restorePanel(selector){
    const anchor = panelAnchors[selector];
    const $el = $(selector);
    if (!anchor || !anchor.parent || !anchor.parent.length || $el.length === 0){
        return;
    }
    $el.detach();
    if (anchor.next){
        $el.insertBefore(anchor.next);
    }
    else {
        anchor.parent.append($el);
    }
}

function moveTopDetailsToSheet(){
    const $detail = $('#mobileTopDetail');
    if ($detail.children().length > 0){
        return;
    }
    $('#topBar .calendar').children().not('.atime').each(function(){
        $(this).detach().appendTo($detail);
    });
    $('#topBar .version').detach().appendTo($detail);
}

function restoreTopDetails(){
    const $cal = $('#topBar .calendar');
    const $topBar = $('#topBar');
    $('#mobileTopDetail').children().each(function(){
        const $child = $(this);
        if ($child.hasClass('version') || $child.is('#versionLog') || $child.find('#versionLog').length){
            $child.detach().appendTo($topBar);
        }
        else {
            $child.detach().appendTo($cal);
        }
    });
}

function layoutMobilePanels(){
    stashAndMove('#race', '#mobileDockRace');
    stashAndMove('#resources', '#mobileDockResources');
    stashAndMove('#msgQueue', '#mobilePanelLog');
    stashAndMove('#buildQueue', '#mobilePanelQueue');
    stashAndMove('#resQueue', '#mobilePanelQueue');
    moveTopDetailsToSheet();

    $('#resources').css({ height: 'auto', maxHeight: 'none' });
    $('#msgQueue').css({ height: 'auto', resize: 'none' }).removeClass('sticky').addClass('vscroll');
    $('#buildQueue').css({ height: 'auto', resize: 'none' });
    syncMobileDockLayout();
}

function hideInspector(){
    $('#mobileInspector').removeClass('visible expanded').attr('aria-hidden', 'true');
    $('body').removeClass('mobile-inspector-open');
    document.documentElement.style.setProperty('--mobile-inspector-height', '0px');
}

function showInspectorChrome(){
    $('#mobileInspector').addClass('visible').attr('aria-hidden', 'false');
    if (inspectorExpanded){
        $('#mobileInspector').addClass('expanded');
    }
    else {
        $('#mobileInspector').removeClass('expanded');
    }
    $('.mobile-inspector-header').attr('aria-expanded', inspectorExpanded ? 'true' : 'false');
    $('body').addClass('mobile-inspector-open');
    syncInspectorLayout();
}

export function showMobileInspector(title, renderBody){
    if (!mobileMode){
        return;
    }
    if (activeSheet){
        activeSheet = null;
        $('body').removeClass('mobile-sheet-open');
        $('.mobile-sheet').removeClass('active').attr('aria-hidden', 'true');
        $('.mobile-nav-btn').removeClass('is-active');
    }
    const body = $('#mobileInspectorBody');
    body.empty();
    renderBody(body);
    $('#mobileInspector .mobile-inspector-title').text(title);
    inspectorHasContent = true;
    inspectorExpanded = true;
    showInspectorChrome();
}

export function clearMobileInspector(){
    inspectorHasContent = false;
    inspectorExpanded = true;
    $('#mobileInspectorBody').empty();
    hideInspector();
}

function restoreDesktopPanels(){
    closeMobileSheet();
    clearMobileInspector();
    restorePanel('#resQueue');
    restorePanel('#buildQueue');
    restorePanel('#msgQueue');
    restorePanel('#resources');
    restorePanel('#race');
    restoreTopDetails();
    $('#msgQueue').css('resize', 'vertical');
}

export function toggleMobileSheet(name){
    if (activeSheet === name){
        closeMobileSheet();
        return;
    }
    openMobileSheet(name);
}

export function openMobileSheet(name){
    if (!mobileMode || name === 'play'){
        closeMobileSheet();
        return;
    }
    if ($('#mobileInspector').hasClass('visible')){
        hideInspector();
    }
    activeSheet = name;
    $('body').addClass('mobile-sheet-open');
    $('.mobile-sheet').removeClass('active').attr('aria-hidden', 'true');
    $(`.mobile-nav-btn`).removeClass('is-active');
    $(`#mobileSheet${capitalize(name)}`).addClass('active').attr('aria-hidden', 'false');
    if (name !== 'top'){
        $(`.mobile-nav-btn[data-sheet="${name}"]`).addClass('is-active');
    }
    adjustMobileHeights();
}

export function closeMobileSheet(){
    activeSheet = null;
    $('body').removeClass('mobile-sheet-open');
    $('.mobile-sheet').removeClass('active').attr('aria-hidden', 'true');
    $('.mobile-nav-btn').removeClass('is-active');
    if (inspectorHasContent){
        showInspectorChrome();
    }
}

export function syncInspectorLayout(){
    if (!mobileMode || !$('#mobileInspector').hasClass('visible')){
        document.documentElement.style.setProperty('--mobile-inspector-height', '0px');
        return;
    }
    const height = $('#mobileInspector').outerHeight() || 0;
    document.documentElement.style.setProperty('--mobile-inspector-height', `${height}px`);
    const navHeight = $('#mobileNav').outerHeight() || 52;
    const topHeight = $('#topBar').outerHeight() || 32;
    const dockHeight = $('#mobileResourceDock').outerHeight() || 0;
    const inspectorHeader = $('.mobile-inspector-header').outerHeight() || 36;
    const sheetMax = Math.max(160, window.innerHeight - navHeight - topHeight - dockHeight - inspectorHeader - 24);
    $('#mobileInspectorBody').css('max-height', `${Math.min(sheetMax, window.innerHeight * 0.4)}px`);
    const totalHeight = $('#mobileInspector').outerHeight() || 0;
    document.documentElement.style.setProperty('--mobile-inspector-height', `${totalHeight}px`);
}

function capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function adjustMobileHeights(){
    if (!mobileMode){
        return;
    }
    syncMobileDockLayout();
    syncInspectorLayout();
    const navHeight = $('#mobileNav').outerHeight() || 52;
    const topHeight = $('#topBar').outerHeight() || 32;
    const dockHeight = $('#mobileResourceDock').outerHeight() || 0;
    const inspectorHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-inspector-height')) || 0;
    const sheetMax = Math.max(200, window.innerHeight - navHeight - topHeight - dockHeight - inspectorHeight - 16);
    $('.mobile-sheet.active .mobile-sheet-body').css('max-height', `${sheetMax}px`);
}

export function syncMobileDockLayout(){
    if (!mobileMode){
        document.documentElement.style.removeProperty('--mobile-dock-height');
        return;
    }
    const dockHeight = $('#mobileResourceDock').outerHeight() || 128;
    document.documentElement.style.setProperty('--mobile-dock-height', `${dockHeight}px`);
}

export function syncMobilePanels(){
    if (!mobileMode){
        return;
    }
    stashAndMove('#resQueue', '#mobilePanelQueue');
    syncMobileDockLayout();
    adjustMobileHeights();
}

export function applyMobileLayout(){
    const mobile = isMobileViewport();
    if (mobile === mobileMode){
        if (mobile){
            adjustMobileHeights();
        }
        return;
    }
    mobileMode = mobile;
    $('body').toggleClass('mobile-layout', mobile);
    if (mobile){
        layoutMobilePanels();
    }
    else {
        restoreDesktopPanels();
    }
    adjustMobileHeights();
}
