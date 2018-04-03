/* eslint class-methods-use-this:off */
/**
 * @overview
 * This library is responsible for constructing and exposing the Topic class
 * to server methods.  Since NodeJS modules are singletons, there will only ever
 * exist a single Topic instance that all modules can subscribe to.
 *
 * The Topic class is a simple event emitter that capture event emissions,
 * attaches a timestamp and defers the callback for performance reasons.
 *
 * The Topic is also responsible for writing event logs to the database.
 *
 * @requires ioredis
 * @requires debug
 */

const Redis = require('ioredis');
const debug = require('debug')('topic:');

// event constants
const events = {
  CREATE : 'create',
  UPDATE : 'update',
  DELETE : 'delete',
  REPORT : 'report',
  LOGIN  : 'login',
  RELOAD : 'reload',
  LOGOUT : 'logout',
  SEARCH : 'search',
};

// event entities
const entities = {
  PATIENT       : 'patient',
  INVOICE       : 'invoice',
  PAYMENT       : 'payment',
  VOUCHER       : 'voucher',
  PATIENT_GROUP : 'patient group',
  DEBTOR_GROUP  : 'debtor_group',
  EMPLOYEE      : 'employee',
  USER          : 'user',
  SERVICE       : 'service',
  SUPPLIER      : 'supplier',
  PERMISSION    : 'permission',
  LOCATION      : 'location',
  CASHBOX       : 'cashbox',
};

// event channels
const channels = {
  ALL       : 'all',
  APP       : 'app',
  MEDICAL   : 'medical',
  FINANCE   : 'finance',
  INVENTORY : 'inventory',
  ADMIN     : 'administration',
};

/**
 * @function serialize
 *
 * @description serializes an object using JSON.stringify()
 *
 * @param {Object} data  an object of data to serialize
 * @returns {String} data  a string representation of the original data that can
 *    be passed to Redis
 */
function serialize(data) {
  return JSON.stringify(data);
}

/**
 * @function serialize
 *
 * @description serializes an object using JSON.stringify()
 *
 * @param {Object} data  an object of data to serialize
 * @returns {String} data  a string representation of the original data that can
 *    be passed to Redis
 */
function deserialize(data) {
  return JSON.parse(data);
}

/**
 * @class Topic
 *
 * @description
 * An event emitter designed to broadcast events throughout and between app
 * instances of the bhima server.  Redis is used to implement a
 * publish/subscribe pattern, publishing events along channels and registering
 * listeners to be called when specific channels are published upon.  Due to the
 * design of ioredis, separate Redis clients are used for publishing and
 * subscribing to messages.
 *
 * @example
 * const Topic = require('lib/Topic');
 *
 * // set up a listener on the MEDICAL channel
 * Topic.subscribe(Topic.channels.MEDICAL, (data) => {
 *   console.log('The MEDICAL channel received ${data}');
 * });
 *
 * // subscribe to every event by listening on the ALL channel
 * Topic.subscribe(Topic.channels.ALL, (data) => {
 *   console.log('This will fire on every event published.);
 * });
 *
 * Topic.publish(Topic.channels.MEDICAL, { message : 'hi' });
 * // console: 'The MEDICAL channel received { message : "hi" }'
 * // console: 'This will fire on every event published.'
 *
 * Topic.unsubscribe(Topic.channels.ALL);
 */
class Topic {
  /**
   * @constructor
   *
   * @description
   * Creates two Redis instances, one for sending and the other for receiving.
   * Sets up a global listener on the 'all' channel that logs all events into
   * the database for future
   */
  constructor() {
    this.disabled = false;

    // perform no configuration if events are disabled
    if (this.disabled) {
      return;
    }

    // create a redis client for pub/sub messaging
    this.publisher = new Redis();
    this.subscriber = new Redis();
  }

  /**
   * @method enable
   *
   * @description
   * Enables the Topic library's functionality.
   */
  enable() {
    this.disabled = false;
  }

  /**
   * @method disable
   *
   * @description
   * Disables the topic library.  If the topic library is disabled, no event
   * emitters are fired.
   */
  disable() {
    this.disabled = true;
  }

  /**
   * @method publish
   *
   * @description
   * Serializes and publishes data along the provided channel using the
   * publisher Redis client.
   *
   * @param {String} channel  the channel identifier to publish data on
   * @param {Object} data  data to send to all subscribers
   */
  publish(channel, data) {
    if (this.disabled) { return; }

    debug(`Received publication on channel "${channel}".`);

    const timestamp = Date.now();

    data.timestamp = timestamp;
    data.channel = channel;

    const serial = serialize(data);

    // skip if broadcasting on the ALL channel (we do this by default anyway)
    if (channel !== channels.ALL) {
      this.publisher.publish(channels.ALL, serial);
    }

    // broadcast on the ALL channel for global listeners
    this.publisher.publish(channel, serial);
  }

  /**
   * @method subscriber
   *
   * @description
   * Register a listener for data along the provided channel using the
   * subscriber Redis client.  Data is deserialized before being handed back to
   * the listener.
   *
   * @param {String} channel  the channel identifier to listen on
   * @param {Function} callback  a function to call with the data when events
   *   are emitted
   */
  subscribe(channel, callback) {
    if (this.disabled) { return; }

    this.subscriber.subscribe(channel, (err, count) => {
      debug(`Subscription count on channel [${channel}] is now [${count}].`);
    });

    // open a subscription to the channel
    const subscription = (chnl, data) =>
      chnl === channel && callback(deserialize(data));

    this.subscriber.on('message', subscription);
  }

  /**
   * @method unsubscribe
   *
   * @description
   * Removes listeners from a given channel.
   *
   * @param {String} channel - the channel to unsubscribe from.
   */
  unsubscribe(channel, subscription) {
    if (this.disabled) { return; }

    debug(`Unsubscribing a listener from ${channel}.`);

    this.subscriber.unsubscribe(channel);
    this.subscriber.removeListener('message', subscription);
  }

  /**
   * @method disconnect
   *
   * @description
   * Disables the library and gracefully closes all connections to redis.
   *
   * @returns Promise
   */
  disconnect() {
    this.disable();
    this.subscriber.removeAllListeners();
    this.publisher.removeAllListeners();
    this.publisher.disconnect();
    this.subscriber.disconnect();
  }

  /* possible channels to subscribe to using the subscribe() method */
  get channels() {
    return channels;
  }

  /* event constants for emitters to consume (defined above) */
  get events() {
    return events;
  }

  /* entities that could be affected by the events */
  get entities() {
    return entities;
  }
}

/* export a singleton Event Emitter */
module.exports = new Topic();
