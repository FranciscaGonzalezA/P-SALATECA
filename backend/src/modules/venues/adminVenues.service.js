export class AdminVenuesService {
  repository;
  constructor(repository) {
    this.repository = repository;
  }
  listPendingVenues() {
    return this.repository.listPendingVenues();
  }
  validateVenue(venueId, regionCode) {
    return this.repository.validateVenue(venueId, regionCode);
  }
}
