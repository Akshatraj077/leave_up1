// backend/utils/paginationUtils.js

const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limitValue = parseInt(query.limit) || 10;
  const limit = Math.min(100, Math.max(1, limitValue)); // limit 1-100
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  getPaginationParams,
  buildPaginatedResponse
};
