import { useState } from 'react';

const STORAGE_KEYS = {
    ORIGIN: 'ontrack_origin',
    DEST: 'ontrack_dest',
    TEMPLATE: 'ontrack_template',
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

    return {
        originId,
        setOriginId: saveOrigin,
        destId,
        setDestId: saveDest,
        template,
        setTemplate: saveTemplate,
        resetTemplate: () => saveTemplate(DEFAULT_TEMPLATE),
    };
}
