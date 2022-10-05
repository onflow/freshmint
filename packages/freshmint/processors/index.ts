import * as metadata from '@freshmint/core/metadata';

export interface FieldProcessor {
  fieldType: metadata.FieldType;
  process(value: metadata.MetadataValue): Promise<metadata.MetadataValue>;
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

  async process(metadata: metadata.MetadataMap) {
    const values: metadata.MetadataMap = {};

    for (const field of this.#schema.fields) {
      const value = metadata[field.name];

      values[field.name] = await this.processField(field, value);
    }

    return values;
  }

  async processField(field: metadata.Field, value: metadata.MetadataValue) {
    for (const fieldProcessor of this.#fieldProcessors) {
      if (field.type === fieldProcessor.fieldType) {
        return fieldProcessor.process(value);
      }
    }

    return value;
  }
}
