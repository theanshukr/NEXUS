import Organization from '#@/modules/organization/models/Organization.js';

export class OrganizationRepository {
  async findById(id, options = {}) {
    return await Organization.findById(id).session(options.session || null);
  }

  async findByCode(code, options = {}) {
    return await Organization.findOne({ code: code.toUpperCase() }).session(options.session || null);
  }

  async findByDomain(domain, options = {}) {
    if (!domain) return null;
    return await Organization.findOne({ domain: domain.toLowerCase() }).session(options.session || null);
  }

  async create(data, options = {}) {
    const org = new Organization(data);
    return await org.save({ session: options.session || null });
  }

  async findAll(options = {}) {
    return await Organization.find({}, null, options).session(options.session || null);
  }
}

export default new OrganizationRepository();
