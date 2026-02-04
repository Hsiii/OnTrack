/**
 * All user-facing strings in the app.
 * Centralized for easier management and future localization.
 */
export const STRINGS = {
    // App Header
    APP_TITLE: 'OnTrack',

    // Labels
    SELECT_ROUTE: '選擇路線',
    SELECT_TRAIN: '選擇班次',
    SEARCH_STATION: '搜尋車站',

    // Train Status
    ON_TIME: 'On Time',
    NEXT_TRAIN: 'Next',
    DELAY_MINUTES: (minutes: number) => `+${minutes} min`,

    // Error Messages
    FAILED_TO_LOAD_SCHEDULE: '無法取得時刻表',
    NO_TRAINS_AVAILABLE: '查無可搭乘班次',

    // Placeholder Messages
    SELECT_STATIONS_PROMPT: '選擇出發及到達車站以查詢時刻表',

    // Buttons
    RETRY: '重試',

    // Share Card
    ARRIVAL_MESSAGE: (time: string, station: string) => `${time}到${station}`,
    NO_TRAIN_MESSAGE: '好像沒車搭了',

    // Alt Text
    LINE_ICON_ALT: 'Line',
} as const;
