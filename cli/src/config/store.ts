import Conf from 'conf';

interface ConfigSchema {
    apiKey?: string;
    baseUrl?: string;
    defaultProjectId?: string;
}

class ConfigStore {
    private store: Conf<ConfigSchema>;

    constructor() {
        this.store = new Conf<ConfigSchema>({
            projectName: 'taskman-cli',
            defaults: {
                baseUrl: 'http://localhost:3000',
            },
        });
    }

    get apiKey(): string | undefined {
        return this.store.get('apiKey');
    }

    set apiKey(value: string) {
        this.store.set('apiKey', value);
    }

    get baseUrl(): string {
        return this.store.get('baseUrl') || 'http://localhost:3000';
    }

    set baseUrl(value: string) {
        this.store.set('baseUrl', value);
    }

    get defaultProjectId(): string | undefined {
        return this.store.get('defaultProjectId');
    }

    set defaultProjectId(value: string | undefined) {
        if (value) {
            this.store.set('defaultProjectId', value);
        } else {
            this.store.delete('defaultProjectId');
        }
    }

    clear(): void {
        this.store.clear();
    }

    getConfigPath(): string {
        return this.store.path;
    }
}

export const config = new ConfigStore();
