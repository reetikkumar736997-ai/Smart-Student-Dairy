window.SAMS_API_ORIGIN =
  window.SAMS_API_ORIGIN ||
  localStorage.getItem('sams_api_origin') ||
  `${window.location.protocol}//${window.location.hostname}:5005`;
