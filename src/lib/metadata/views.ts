import { registerHelper, registerPartial } from '../generators';
import { Field, FieldMap, HTTPFile, IPFSFile } from './fields';

export class View {
  type: ViewType<any>;
  options: any;

  id: string;
  cadenceTypeString: string;

  constructor(type: ViewType<any>, options: any) {
    this.type = type;
    this.options = options;

    this.id = type.id;
    this.cadenceTypeString = type.cadenceTypeString;
  }

  export(): ViewInput {
    return {
      type: this.type.id,
      options: this.exportOptions(),
    };
  }

  private exportOptions(): ViewOptionsInput {
    const exportedOptions = {};

    for (const key in this.options) {
      const option = this.options[key];

      if (option instanceof Field) {
        exportedOptions[key] = option.name;
      } else {
        exportedOptions[key] = option;
      }
    }

    return exportedOptions;
  }
}

export interface ViewType<ViewOptions> {
  (options: ViewOptions): View;
  id: string;
  cadenceTypeString: string;
}

const httpFilePartial = 'http-file';
const ipfsFilePartial = 'ipfs-file';

registerHelper('whichFilePartial', (field) => {
  switch (field.type) {
    case HTTPFile:
      return httpFilePartial;
    case IPFSFile:
      return ipfsFilePartial;
  }

  // TODO: improve error message
  throw 'field must be a file field';
});

registerPartial(httpFilePartial, '../../../cadence/metadata-views/MetadataViews.HTTPFile.partial.cdc');
registerPartial(ipfsFilePartial, '../../../cadence/metadata-views/MetadataViews.IPFSFile.partial.cdc');

export function defineView<ViewOptions>({
  id,
  cadenceTypeString,
  cadenceTemplatePath,
}: {
  id: string;
  cadenceTypeString: string;
  cadenceTemplatePath: string;
}): ViewType<ViewOptions> {
  const viewType = (options: ViewOptions): View => {
    return new View(viewType, options);
  };

  viewType.id = id;
  viewType.cadenceTypeString = cadenceTypeString;

  registerPartial(id, cadenceTemplatePath);

  return viewType;
}

export const DisplayView = defineView<{
  name: Field;
  description: Field;
  thumbnail: Field;
}>({
  id: 'display',
  cadenceTypeString: 'Type<MetadataViews.Display>()',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.Display.partial.cdc',
});

export const MediaView = defineView<{
  file: Field;
  mediaType: string;
}>({
  id: 'media',
  cadenceTypeString: 'Type<MetadataViews.Media>()',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.Media.partial.cdc',
});

export const viewsTypes: ViewType<any>[] = [DisplayView, MediaView];

const viewsTypesById: { [key: string]: ViewType<any> } = viewsTypes.reduce(
  (views, view) => ({ [view.id]: view, ...views }),
  {},
);

function getViewTypeById(id: string): ViewType<any> {
  return viewsTypesById[id];
}

export type ViewInput = { type: string; options: any };
export type ViewOptionsInput = { [key: string]: string };

export function parseViews(views: ViewInput[], fieldMap: FieldMap): View[] {
  return views.map((view: ViewInput) => {
    const viewType = getViewTypeById(view.type);

    // TODO: improve this field mapping logic.
    //
    // Currently it replaces any string that matches a field name.
    // Should it be smarter?
    const options = {};

    for (const name in view.options) {
      const fieldName = view.options[name];
      const field = fieldMap[fieldName];

      if (field) {
        options[name] = field;
      }
    }

    return viewType(options);
  });
}
