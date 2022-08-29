import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

import { FreshmintError } from '../errors';
import { ConfigFieldError, ConfigFieldErrors, UndefinedConfigFieldError, extendKeyPath } from './errors';
import { envsubst } from './envsubst';

export type RawConfig = { [key: string]: any };
export type RawValue = RawConfig | any;

export abstract class ConfigValue<T> {
  key: string;

  protected _value: T;
  protected _defaultValue?: T = undefined;
  protected _rawValue: RawValue;
  protected _isEnabled = true;
  protected _isEnabledReason?: string = undefined;
  protected _onLoad?: (value: any) => void = undefined;

  constructor(key: string) {
    this.key = key;
  }

  abstract load(raw: RawConfig, keyPath?: string[]): T;
  abstract export(): RawValue;

  onLoad(func: (value: T) => void): void {
    this._onLoad = func;
  }

  setDefault(value: T): ConfigField<T> {
    this._defaultValue = value;
    return this;
  }

  setValue(value: T): ConfigField<T> {
    this._value = value;
    return this;
  }

  setRawValue(rawValue: RawValue): ConfigField<T> {
    this._rawValue = rawValue;
    return this;
  }

  setEnabled(enabled: boolean, reason?: string): ConfigField<T> {
    this._isEnabled = enabled;
    this._isEnabledReason = reason;
    return this;
  }

  isEnabled(): boolean {
    return this._isEnabled;
  }

  isEnabledReason(): string {
    return this._isEnabledReason;
  }
}

export type ConfigSchema = { [key: string]: ConfigValue<any> };

export type ConfigFieldImporter<T> = (input: any, rawInput?: any) => T;
export type ConfigFieldExporter<T> = (input: T) => RawValue;

export class ConfigField<T> extends ConfigValue<T> {
  #import?: ConfigFieldImporter<T>;
  #export?: ConfigFieldExporter<T>;
  #onLoad?: (value: any) => void = undefined;

  constructor(key: string, importer?: ConfigFieldImporter<T>, exporter?: ConfigFieldExporter<T>) {
    super(key);

    this.#import = importer;
    this.#export = exporter;
  }

  load(raw: RawConfig): T {
    if (!(this.key in raw)) {
      if (this._defaultValue !== undefined) {
        return this._defaultValue;
      }

      throw new UndefinedConfigFieldError(this._isEnabledReason);
    }

    const rawInput = raw[this.key];
    let input = rawInput;

    if (typeof input === 'string') {
      input = envsubst(input);
    }

    let value = input;

    if (this.#import) {
      value = this.#import(input, rawInput);
    }

    if (this.#onLoad) {
      this.#onLoad(value);
    }

    this._value = value;

    return value;
  }

  onLoad(func: (value: T) => void) {
    this.#onLoad = func;
  }

  export(): RawValue {
    if (this._rawValue !== undefined) {
      return this._rawValue;
    }

    if (this.#export !== undefined) {
      return this.#export(this._value);
    }

    return this._value;
  }
}

export type ConfigFields<T> = {
  [Property in keyof T]: ConfigField<T[Property]>;
};

export class ConfigMap<T> extends ConfigValue<T> {
  fields: ConfigFields<T>;

  constructor(key: string, fields: ConfigFields<T>) {
    super(key);
    this.fields = fields;
  }

  load(raw: RawConfig, keyPath: string[] = []): T {
    const currentKeyPath = extendKeyPath(keyPath, this.key);

    if (!(this.key in raw)) {
      throw new UndefinedConfigFieldError(this._isEnabledReason);
    }

    const rawValue = raw[this.key] || {};

    const values: any = {};

    const errors: ConfigFieldError[] = [];

    for (const name in this.fields) {
      const field = this.fields[name];
      try {
        const value = field.load(rawValue);
        values[name] = value;
      } catch (error: any) {
        if (error instanceof FreshmintError) {
          errors.push({
            keyPath: extendKeyPath(currentKeyPath, field.key),
            error,
          });
        } else {
          throw error;
        }
      }
    }

    if (errors.length) {
      throw errors;
    }

    if (this._onLoad) {
      this._onLoad(values);
    }

    return values as T;
  }

  onLoad(func: (value: T) => void) {
    this._onLoad = func;
  }

  export(): RawValue {
    if (this._rawValue !== undefined) {
      return this._rawValue;
    }

    const rawValues: any = {};

    for (const name in this.fields) {
      const field = this.fields[name];
      const value = this._value[name];

      const rawValue = field.setValue(value).export();

      rawValues[name] = rawValue;
    }

    return rawValues;
  }
}

export function Field<T>(
  key: string,
  importer?: ConfigFieldImporter<T>,
  exporter?: ConfigFieldExporter<T>,
): ConfigField<T> {
  return new ConfigField<T>(key, importer, exporter);
}

export function Map<T>(key: string, fields: ConfigFields<T>): ConfigMap<T> {
  return new ConfigMap<T>(key, fields) as ConfigMap<T>;
}

export class ConfigReader<T, U extends ConfigSchema = ConfigSchema> {
  #schema: U;

  constructor(schema: U) {
    this.#schema = schema;
  }

  modifySchema(func: (schema: U) => void): ConfigReader<T, U> {
    func(this.#schema);
    return this;
  }

  load(filename: string, basePath?: string): T {
    const rawConfig = loadRawConfig(filename, basePath);

    const values = {};

    const errors: ConfigFieldError[] = [];

    for (const name in this.#schema) {
      const field = this.#schema[name];

      if (!field.isEnabled()) {
        continue;
      }

      try {
        const value = field.load(rawConfig);
        values[name as string] = value;
      } catch (error: any) {
        if (error instanceof FreshmintError) {
          errors.push({ keyPath: [field.key], error: error });
        } else if (Array.isArray(error)) {
          errors.push(...error);
        } else {
          throw error;
        }
      }
    }

    if (errors.length) {
      throw new ConfigFieldErrors(errors, `Invalid configuration in ${filename}`);
    }

    return values as T;
  }
}

export class ConfigWriter<U extends ConfigSchema = ConfigSchema> {
  #schema: U;

  constructor(schema: U) {
    this.#schema = schema;
  }

  setValues(func: (schema: U) => void): ConfigWriter<U> {
    func(this.#schema);
    return this;
  }

  write(filename: string, basePath?: string) {
    const rawConfig = {};

    for (const name in this.#schema) {
      const field = this.#schema[name as string];
      const value = field.export();
      rawConfig[name as string] = value;
    }

    saveRawConfig(filename, rawConfig, basePath);
  }
}

function loadRawConfig(filename: string, basePath?: string): any {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const filepath = path.resolve(basePath ?? process.cwd(), filename);
  const contents = fs.readFileSync(filepath, 'utf8');

  return yaml.load(contents);
}

function saveRawConfig(filename: string, config: RawConfig, basePath?: string) {
  const filepath = path.resolve(basePath ?? process.cwd(), filename);

  const contents = yaml.dump(config);

  fs.writeFileSync(filepath, contents, 'utf8');
}
