import { useState } from 'react';

const STORAGE_KEYS = {
    ORIGIN: 'ontrack_origin',
    DEST: 'ontrack_dest',
    TEMPLATE: 'ontrack_template',
    AUTO_DETECT_ORIGIN: 'ontrack_auto_detect_origin',
};

const DEFAULT_TEMPLATE = '{adjusted_time}到{dest}';

// Validate station ID format (alphanumeric with optional dash, max 10 chars)
function isValidStationId(id: string): boolean {
    return /^[A-Z0-9-]*$/i.test(id) && id.length <= 10;
}

// Safe localStorage getter with validation
function getValidatedStationId(key: string): string {
    const value = localStorage.getItem(key) || '';
    return isValidStationId(value) ? value : '';
}

export function usePersistence() {
    const [originId, setOriginId] = useState<string>(() =>
        getValidatedStationId(STORAGE_KEYS.ORIGIN)
    );
    const [destId, setDestId] = useState<string>(() =>
        getValidatedStationId(STORAGE_KEYS.DEST)
    );
    const [template, setTemplate] = useState<string>(
        () => localStorage.getItem(STORAGE_KEYS.TEMPLATE) || DEFAULT_TEMPLATE
    );
    const [autoDetectOrigin, setAutoDetectOrigin] = useState<boolean>(
        () => localStorage.getItem(STORAGE_KEYS.AUTO_DETECT_ORIGIN) === 'true'
    );

    const saveOrigin = (id: string) => {
        if (!isValidStationId(id)) return;
        setOriginId(id);
        localStorage.setItem(STORAGE_KEYS.ORIGIN, id);
    };

    const saveDest = (id: string) => {
        if (!isValidStationId(id)) return;
        setDestId(id);
        localStorage.setItem(STORAGE_KEYS.DEST, id);
    };

    const saveTemplate = (tpl: string) => {
        setTemplate(tpl);
        localStorage.setItem(STORAGE_KEYS.TEMPLATE, tpl);
    };

    const saveAutoDetectOrigin = (value: boolean) => {
        setAutoDetectOrigin(value);
        localStorage.setItem(STORAGE_KEYS.AUTO_DETECT_ORIGIN, String(value));
    };

    return {
        originId,
        setOriginId: saveOrigin,
        destId,
        setDestId: saveDest,
        template,
        setTemplate: saveTemplate,
        resetTemplate: () => saveTemplate(DEFAULT_TEMPLATE),
        autoDetectOrigin,
        setAutoDetectOrigin: saveAutoDetectOrigin,
    };
}
