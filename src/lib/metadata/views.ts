import { registerHelper, registerPartial } from '../generators';
import { Field, FieldMap, HTTPFile, IPFSFile } from './fields';

export class View {
  type: ViewType<any>;
  options: any;

  id: string;
  cadenceResolverFunction?: string;
  cadenceTypeString: string;
  requiresMetadata: boolean;

  constructor(type: ViewType<any>, options: any) {
    this.type = type;
    this.options = options;

    this.id = type.id;
    this.cadenceResolverFunction = type.cadenceResolverFunction;
    this.cadenceTypeString = type.cadenceTypeString;
    this.requiresMetadata = type.requiresMetadata;
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
  cadenceResolverFunction?: string;
  requiresMetadata: boolean;
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

registerPartial('viewCase', '../../../cadence/metadata-views/viewCase.partial.cdc');
registerPartial(httpFilePartial, '../../../cadence/metadata-views/MetadataViews.HTTPFile.partial.cdc');
registerPartial(ipfsFilePartial, '../../../cadence/metadata-views/MetadataViews.IPFSFile.partial.cdc');

export const viewsTypes: ViewType<any>[] = [];

export function defineView<ViewOptions>({
  id,
  cadenceTypeString,
  cadenceResolverFunction,
  cadenceTemplatePath,
  requiresMetadata,
}: {
  id: string;
  cadenceTypeString: string;
  cadenceResolverFunction?: string;
  cadenceTemplatePath: string;
  requiresMetadata: boolean;
}): ViewType<ViewOptions> {
  const viewType = (options: ViewOptions): View => {
    return new View(viewType, options);
  };

  viewType.id = id;
  viewType.cadenceResolverFunction = cadenceResolverFunction;
  viewType.cadenceTypeString = cadenceTypeString;
  viewType.requiresMetadata = requiresMetadata;

  registerPartial(id, cadenceTemplatePath);

  // Add this view to the view type list
  viewsTypes.push(viewType);

  return viewType;
}

export const DisplayView = defineView<{
  name: Field;
  description: Field;
  thumbnail: Field;
}>({
  id: 'display',
  cadenceTypeString: 'Type<MetadataViews.Display>()',
  cadenceResolverFunction: 'resolveDisplay',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.Display.partial.cdc',
  requiresMetadata: true,
});

export const ExternalURLView = defineView<{ cadenceTemplate: string }>({
  id: 'external-url',
  cadenceTypeString: 'Type<MetadataViews.ExternalURL>()',
  cadenceResolverFunction: 'resolveExternalURL',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.ExternalURL.partial.cdc',
  requiresMetadata: false,
});

export const NFTCollectionDisplayView = defineView<{
  name: string;
  description: string;
  url: string;
  media: {
    ipfsCid: string;
    type: string;
  };
}>({
  id: 'nft-collection-display',
  cadenceTypeString: 'Type<MetadataViews.NFTCollectionDisplay>()',
  cadenceResolverFunction: 'resolveNFTCollectionDisplay',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.NFTCollectionDisplay.partial.cdc',
  requiresMetadata: false,
});

export const NFTView = defineView<void>({
  id: 'nft',
  cadenceTypeString: 'Type<MetadataViews.NFTView>()',
  cadenceResolverFunction: 'resolveNFTView',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.NFTView.partial.cdc',
  requiresMetadata: true,
});

export const MediaView = defineView<{
  file: Field;
  mediaType: string;
}>({
  id: 'media',
  cadenceTypeString: 'Type<MetadataViews.Media>()',
  cadenceTemplatePath: '../../../cadence/metadata-views/MetadataViews.Media.partial.cdc',
  requiresMetadata: true,
});

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
    const options = view.options;

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
