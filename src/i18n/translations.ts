import type { LanguageOption } from './types';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'en', label: 'English' },
];

export const translations = {
    'zh-TW': {
        'app.title': 'OnTrack',
        'app.selectRoute': '選擇路線',
        'app.selectTrain': '選擇班次',
        'app.searchStation': '搜尋車站',
        'app.selectStationsPrompt': '選擇出發及到達車站以查詢時刻表',
        'app.switchToEnglish': '切換成英文',
        'app.switchToChinese': '切換成中文',
        'app.enableAutoDetectOrigin': '開啟定位起點',
        'app.disableAutoDetectOrigin': '關閉定位起點',
        'language.openDialog': '開啟語言選單',
        'language.selectTitle': '選擇語言',
        'language.zhTW': '繁體中文',
        'language.en': 'English',

        'train.onTime': 'On Time',
        'train.delayMinutes': '+{minutes} min',
        'train.noTrainsAvailable': '查無可搭乘班次',

        'error.failedToLoadSchedule': '無法取得時刻表',
        'common.retry': '重試',

        'share.arrivalMessage': '{time}到{station}',
        'share.noTrainMessage': '好像沒車搭了',
        'share.lineIconAlt': 'Line',

        'iosInstall.title': '加到主畫面',
        'iosInstall.subtitle': '將 {appName} 加入主畫面以享受最佳使用體驗',
        'iosInstall.step1': '點擊底部的「分享」按鈕',
        'iosInstall.step2': '選擇「加入主畫面」',
        'iosInstall.dismiss': '知道了',
    },
    'en': {
        'app.title': 'OnTrack',
        'app.selectRoute': 'Select Route',
        'app.selectTrain': 'Select Train',
        'app.searchStation': 'Search station',
        'app.selectStationsPrompt':
            'Select origin and destination stations to view schedules',
        'app.switchToEnglish': 'Switch to English',
        'app.switchToChinese': 'Switch to Chinese',
        'app.enableAutoDetectOrigin': 'Enable origin auto-detect',
        'app.disableAutoDetectOrigin': 'Disable origin auto-detect',
        'language.openDialog': 'Open language menu',
        'language.selectTitle': 'Select language',
        'language.zhTW': 'Traditional Chinese',
        'language.en': 'English',

        'train.onTime': 'On Time',
        'train.delayMinutes': '+{minutes} min',
        'train.noTrainsAvailable': 'No trains available',

        'error.failedToLoadSchedule': 'Failed to load schedule',
        'common.retry': 'Retry',

        'share.arrivalMessage': 'Arrive at {station} by {time}',
        'share.noTrainMessage': 'No more trains available',
        'share.lineIconAlt': 'Line',

        'iosInstall.title': 'Add to Home Screen',
        'iosInstall.subtitle':
            'Add {appName} to your Home Screen for the best experience',
        'iosInstall.step1': 'Tap the Share button at the bottom',
        'iosInstall.step2': 'Choose Add to Home Screen',
        'iosInstall.dismiss': 'Got it',
    },
} as const;

export type TranslationKey = keyof (typeof translations)['zh-TW'];

export const FALLBACK_LANGUAGE: keyof typeof translations = 'zh-TW';
export const STORAGE_LANGUAGE_KEY = 'ontrack_language';
