import type { Prettify } from '@directus/types';
import type {
	DisplayConfig,
	EndpointConfig,
	HookConfig,
	InterfaceConfig,
	LayoutConfig,
	ModuleConfig,
	OperationApiConfig,
	OperationAppConfig,
	PanelConfig,
} from '../types/index.js';

type CustomConfig<T> = { [K in string]: K extends keyof T ? never : unknown };

type ExtendedConfig<T, C> = Prettify<T & Omit<C, keyof T>>;

export function defineInterface<Custom extends CustomConfig<InterfaceConfig>>(
	config: ExtendedConfig<InterfaceConfig, Custom>,
): ExtendedConfig<InterfaceConfig, Custom> {
	return config;
}

export function defineDisplay<Custom extends CustomConfig<DisplayConfig>>(
	config: ExtendedConfig<DisplayConfig, Custom>,
): ExtendedConfig<DisplayConfig, Custom> {
	return config;
}

export function defineLayout<Options = any, Query = any>(
	config: LayoutConfig<Options, Query>,
): LayoutConfig<Options, Query> {
	return config;
}

export function defineModule<Custom extends CustomConfig<ModuleConfig>>(
	config: ExtendedConfig<ModuleConfig, Custom>,
): ExtendedConfig<ModuleConfig, Custom> {
	return config;
}

export function definePanel<Custom extends CustomConfig<PanelConfig>>(
	config: ExtendedConfig<PanelConfig, Custom>,
): ExtendedConfig<PanelConfig, Custom> {
	return config;
}

export function defineHook<Custom extends CustomConfig<HookConfig>>(
	config: ExtendedConfig<HookConfig, Custom>,
): ExtendedConfig<HookConfig, Custom> {
	return config;
}

export function defineEndpoint<Custom extends CustomConfig<EndpointConfig>>(
	config: ExtendedConfig<EndpointConfig, Custom>,
): ExtendedConfig<EndpointConfig, Custom> {
	return config;
}

export function defineOperationApp<Custom extends CustomConfig<OperationAppConfig>>(
	config: ExtendedConfig<OperationAppConfig, Custom>,
): ExtendedConfig<OperationAppConfig, Custom> {
	return config;
}

export function defineOperationApi<Options = Record<string, unknown>>(
	config: OperationApiConfig<Options>,
): OperationApiConfig<Options> {
	return config;
}
