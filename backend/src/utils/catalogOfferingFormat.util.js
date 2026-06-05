'use strict';

const { parseJsonArray } = require('./catalogJson');

function formatGallery(raw) {
  return parseJsonArray(raw).filter((url) => typeof url === 'string' && url.trim());
}

function formatFormation(row, opts = {}) {
  const center = opts.center || row.center;
  return {
    id: row.id,
    centerId: row.center_id,
    centerName: center?.name ?? opts.centerName ?? null,
    title: row.title,
    category: row.category,
    shortDescription: row.short_description,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    durationLabel: row.duration_label,
    city: row.city,
    address: row.address,
    deliveryMode: row.delivery_mode,
    price: row.price != null ? Number(row.price) : null,
    certificateDelivered: Boolean(row.certificate_delivered),
    seats: row.seats,
    mainImageUrl: row.main_image_url,
    gallery: formatGallery(row.gallery_json),
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    adminNote: row.admin_note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participationType: opts.participationType ?? null,
    participantsCount: opts.participantsCount ?? null,
  };
}

function formatEvent(row, opts = {}) {
  const center = opts.center || row.center;
  return {
    id: row.id,
    centerId: row.center_id,
    centerName: center?.name ?? opts.centerName ?? null,
    title: row.title,
    eventType: row.event_type,
    description: row.description,
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    city: row.city,
    address: row.address,
    price: row.price != null ? Number(row.price) : null,
    seats: row.seats,
    posterImageUrl: row.poster_image_url,
    gallery: formatGallery(row.gallery_json),
    phone: row.phone,
    email: row.email,
    website: row.website,
    status: row.status,
    adminNote: row.admin_note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    participationType: opts.participationType ?? null,
    participantsCount: opts.participantsCount ?? null,
  };
}

module.exports = {
  formatGallery,
  formatFormation,
  formatEvent,
};
