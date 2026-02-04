import { useState } from 'react';

const STORAGE_KEYS = {
    ORIGIN: 'ontrack_origin',
    DEST: 'ontrack_dest',
    TEMPLATE: 'ontrack_template',
    AUTO_DETECT_ORIGIN: 'ontrack_auto_detect_origin',
    DEFAULT_DEST: 'ontrack_default_dest',
};

const DEFAULT_TEMPLATE = '{adjusted_time}到{dest}';

export function usePersistence() {
    const [originId, setOriginId] = useState<string>(
        () => localStorage.getItem(STORAGE_KEYS.ORIGIN) || ''
    );
    const [destId, setDestId] = useState<string>(
        () => localStorage.getItem(STORAGE_KEYS.DEST) || ''
    );
    const [template, setTemplate] = useState<string>(
        () => localStorage.getItem(STORAGE_KEYS.TEMPLATE) || DEFAULT_TEMPLATE
    );
    const [autoDetectOrigin, setAutoDetectOrigin] = useState<boolean>(
        () => localStorage.getItem(STORAGE_KEYS.AUTO_DETECT_ORIGIN) !== 'false'
    );
    const [defaultDestId, setDefaultDestId] = useState<string>(
        () => localStorage.getItem(STORAGE_KEYS.DEFAULT_DEST) || ''
    );

    const saveOrigin = (id: string) => {
        setOriginId(id);
        localStorage.setItem(STORAGE_KEYS.ORIGIN, id);
    };

    const saveDest = (id: string) => {
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

    const saveDefaultDest = (id: string) => {
        setDefaultDestId(id);
        localStorage.setItem(STORAGE_KEYS.DEFAULT_DEST, id);
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
        defaultDestId,
        setDefaultDestId: saveDefaultDest,
    };
}
