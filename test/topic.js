import test from 'ava';
import sinon from 'sinon';

import topic from '..';

const isObj = o => typeof o === 'object';
const payload = () => ({ id : Math.random(), name : 'John Doe' });

test.after.always('disconnect redis', () => {
  topic.disconnect();
});

test('topic should not be disabled on startup', t => {
  t.false(topic.disabled);
});

test('topic exports channels, events, and entities', t => {
  t.true(isObj(topic.channels));
  t.true(isObj(topic.entities));
  t.true(isObj(topic.events));
});

test.cb('#subscribe() listens to events published in it\'s channel', t => {
  t.plan(1);

  const channel = 'A';
  const data = { text : 'hello world' };

  topic.subscribe(channel, datum => {
    t.is(data.text, datum.text);
    t.end();
  });

  topic.publish(channel, data);
});

test.cb('#subscribe() does not leak events outside of it\'s channel', t => {
  t.plan(2);
  const data = payload();
  const channel = 'X';

  const spy = sinon.spy();
  topic.subscribe('Y', () => spy());

  topic.subscribe(channel, msg => {
    t.is(msg.id, data.id);
    t.true(spy.notCalled);
    t.end();
  });

  // publish on channel X
  topic.publish(channel, data);
});

test.cb('#publish() will call a subscription multiple times.', t => {
  t.plan(1);

  const spy = sinon.spy();
  const channel = 'B';

  topic.subscribe(channel, spy);

  topic.publish(channel, payload());
  topic.publish(channel, payload());
  topic.publish(channel, payload());

  topic.subscribe('N', () => {
    t.true(spy.calledThrice);
    t.end();
  });

  topic.publish('N', {});
});

test.cb('#unsubscribe() will remove listeners from a channel', t => {
  t.plan(1);
  const channel = 'C';
  const spy = sinon.spy();

  topic.subscribe(channel, spy);
  topic.publish(channel, payload());

  // remove subscription
  topic.unsubscribe(channel, spy);

  // publish a few more times
  topic.publish(channel, payload());
  topic.publish(channel, payload());

  topic.subscribe('ENDTEST', () => {
    t.is(spy.callCount, 1);
    t.end();
  });

  topic.publish('ENDTEST', {});
});
