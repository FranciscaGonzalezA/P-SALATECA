import type { HttpClient } from '../http/httpClient.js';
import { CinetecaConnector } from './cinetecaConnector.js';
import { CineUcConnector } from './cineUcConnector.js';
import { DuocLumaConnector } from './duocLumaConnector.js';
import { EcopassCineCccConnector } from './ecopassCineCccConnector.js';
import { ElBiografoConnector } from './elBiografoConnector.js';
import { GoetheChileConnector } from './goetheChileConnector.js';
import { M100Connector } from './m100Connector.js';
import { NexoInstagramConnector } from './nexoInstagramConnector.js';
import { NormandieConnector } from './normandieConnector.js';
import { PasslineAlamedaConnector } from './passlineAlamedaConnector.js';
import { SalaKConnector } from './salaKConnector.js';
import type { SourceConnector } from './sourceConnector.js';
import { TicketplusNemesioConnector } from './ticketplusNemesioConnector.js';

export interface DefaultConnectorOptions {
  nexoInstagramAccessToken?: string | undefined;
}

export function createDefaultConnectors(
  http: HttpClient,
  options: DefaultConnectorOptions = {},
): SourceConnector[] {
  const connectors: SourceConnector[] = [
    new NormandieConnector(http),
    new PasslineAlamedaConnector(http),
    new ElBiografoConnector(http),
    new SalaKConnector(http),
    new TicketplusNemesioConnector(http),
    new EcopassCineCccConnector(http),
    new M100Connector(http),
    new GoetheChileConnector(http),
    new CinetecaConnector(http),
    new CineUcConnector(http),
    new DuocLumaConnector(http),
  ];
  if (options.nexoInstagramAccessToken) {
    connectors.push(new NexoInstagramConnector(http, options.nexoInstagramAccessToken));
  }
  return connectors;
}
