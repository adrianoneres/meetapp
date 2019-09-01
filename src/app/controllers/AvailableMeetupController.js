import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { Op } from 'sequelize';

import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class AvailableMeetupController {
  async index(req, res) {
    const page = req.query.page || 1;
    const where = {};

    if (req.query.date) {
      const betweenDate = parseISO(req.query.date);

      where.date = {
        [Op.between]: [startOfDay(betweenDate), endOfDay(betweenDate)],
      };
    }

    const meetups = await Meetup.findAll({
      where,
      include: [
        {
          model: User,
          required: true,
          attributes: ['id', 'name'],
        },
        {
          model: File,
          required: true,
          attributes: ['id', 'path', 'url'],
        },
      ],
      limit: 10,
      offset: 10 * page - 10,
    });

    const total = await Meetup.count({ where });

    res.set('x-total-count', total);

    return res.json(meetups);
  }
}

export default new AvailableMeetupController();
