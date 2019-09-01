import { isBefore } from 'date-fns';
import { Op } from 'sequelize';

import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';
import SubscriptionMail from '../jobs/SubscriptionMail';
import Queue from '../../lib/Queue';
import User from '../models/User';
import File from '../models/File';

class SubscriptionController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: {
              [Op.gt]: new Date(),
            },
          },
          include: [
            {
              model: User,
              required: true,
              attributes: ['id', 'name'],
            },
            File,
          ],
        },
      ],
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [User],
    });

    if (meetup.user_id === user.id) {
      return res
        .status(400)
        .json({ error: 'You can not subscribe to your own meetup.' });
    }

    if (isBefore(meetup.date, new Date())) {
      return res
        .status(400)
        .json({ error: 'You can not subscribe to a past meetup.' });
    }

    const subscribed = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: [
        {
          model: Meetup,
          required: true,
          where: {
            date: meetup.date,
          },
        },
      ],
    });

    if (subscribed) {
      return res
        .status(400)
        .json('You are already subscribed to a meetup on this date.');
    }

    const subscription = Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    await Queue.add(SubscriptionMail.key, {
      meetup,
      user,
    });

    return res.json(subscription);
  }

  async delete(req, res) {
    const subscription = await Subscription.findByPk(req.params.id);

    if (subscription.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You can not delete a subscription you did not create.',
      });
    }

    await subscription.destroy();

    return res.send();
  }
}

export default new SubscriptionController();
