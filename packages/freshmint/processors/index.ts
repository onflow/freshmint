import * as metadata from '@freshmint/core/metadata';

import { Entry } from '../loaders';
import { PreparedMetadata, PreparedMetadataValue } from '../minters';

export interface FieldProcessor {
  fieldType: metadata.FieldType;
  prepare(value: any): Promise<any>;
  process(raw: any, prepared: any): Promise<void>;
}

export class MetadataProcessor {
  #schema: metadata.Schema;
  #fieldProcessors: FieldProcessor[];

  constructor(schema: metadata.Schema) {
    this.#schema = schema;
    this.#fieldProcessors = [];
  }

  addFieldProcessor(fieldProcessor: FieldProcessor) {
    this.#fieldProcessors.push(fieldProcessor);
  }

  async prepare(entry: Entry): Promise<PreparedMetadata> {
    const metadata: PreparedMetadata = {};

    for (const field of this.#schema.fields) {
      const value = field.getValue(entry);

      metadata[field.name] = {
        raw: value,
        prepared: await this.prepareField(field, value)
      }
    }

    return metadata;
  }

  async prepareField(field: metadata.Field, value: any) {
    for (const fieldProcessor of this.#fieldProcessors) {
      if (field.type === fieldProcessor.fieldType) {
        return fieldProcessor.prepare(value);
      }
    }

    return value;
  }

  async process(metadata: PreparedMetadata): Promise<void> {
    for (const field of this.#schema.fields) {
      const value = metadata[field.name];
      await this.processField(field, value);
    }
  }

  async processField(field: metadata.Field, value: PreparedMetadataValue) {
    for (const fieldProcessor of this.#fieldProcessors) {
      if (field.type === fieldProcessor.fieldType) {
        await fieldProcessor.process(value.raw, value.prepared);
      }
    }
  }
}
