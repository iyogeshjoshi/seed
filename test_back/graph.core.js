describe('Graph Core', function () {
  var Graph = seed.Graph
    , Person = seed.Model.extend('person', {})
    , Location = seed.Model.extend('location', {});

  var arthur = {
      _id: 'arthur'
    , name: 'Arthur Dent'
    , stats: {
          origin: 'Earth'
        , occupation: 'traveller'
        , species: 'human'
      }
  };

  var ford = {
      _id: 'ford'
    , name: 'Ford Prefect'
    , stats: {
          origin: 'Betelgeuse-ish'
        , occupation: 'traveller'
        , species: 'writer'
      }
  };

  var earth = {
      _id: 'earth'
    , name: 'Dent\'s Planet Earth'
  };

  var ship = {
      _id: 'gold'
    , name: 'Starship Heart of Gold'
  };

  describe('constructor', function () {
    var n = 0
      , graph = Graph.extend('people', {
          initialize: function () {
            n++;
          }
        })
      , g = new graph();

    it('should call initialize', function () {
      n.should.equal(1);
    });

    it('should emit events', function () {
      var spy = chai.spy();
      g.on('test', spy);
      g.emit('test');
      spy.should.have.been.called.once;
    });

    it('should define itself as a graph', function () {
      Graph.toString().should.equal('[object Graph]');
    });

    it('should know its types', function () {
      g.define('person', { _id: String });
      g.types.should.include('person');
    });
  });

  describe('configuration', function () {
    it('should understand types', function () {
      var graph = new Graph({ type: 'people' });
      graph.type.should.equal('people');
      var People = Graph.extend('people')
        , people = new People();
      people.type.should.equal('people');
      people.type = 'aliens';
      people.type.should.not.equal('aliens');
      people.type.should.equal('people');
    });
  });

  describe('flags', function () {
    var g = new seed.Graph();

    beforeEach(function () {
      g.off();
    });

    it('should be able to set a single flag', function () {
      var spy = chai.spy(function (val) {
        val.should.equal('universe');
      });
      g.on([ 'flag', 'hello' ], spy);
      g.flag('hello', 'universe');
      g._flags.get('hello').should.equal('universe');
      spy.should.have.been.called.once;
    });

    it('should be able to set a single flag silently', function () {
      var spy = chai.spy(function (val) {
        val.should.equal('universe');
      });
      g.on([ 'flag', 'hello' ], spy);
      g.flag('hello', 'universe', true);
      g._flags.get('hello').should.equal('universe');
      spy.should.have.been.not_called;
    });

    it('should be able to set a flag array', function () {
      var spy = chai.spy(function (val) {
        val.should.equal('universe');
      });
      g.on([ 'flag', '*' ], spy);
      g.flag([ 'world', 'universe' ], 'universe');
      g._flags.get('hello').should.equal('universe');
      spy.should.have.been.called.twice;
    });

    it('should be able to set a flag array silently', function () {
      var spy = chai.spy(function (val) {
        val.should.equal('universe');
      });
      g.on([ 'flag', '*' ], spy);
      g.flag([ 'world', 'universe' ], 'universe', true);
      g._flags.get('hello').should.equal('universe');
      spy.should.have.been.not_called;
    });
  });

  describe('type definitions', function () {
    var g = new Graph();

    it('should be able to accept a model definition', function () {
      g.define('person', Person);
      g.types.should.include('person');
    });

    it('should be able to accept a schema instance', function () {
      var s = new seed.Schema({
        name: String
      });

      g.define('person2', s);
      g.types.should.include('person2');
    });

    it('should be able to accept a schema definition', function () {
      var s = {
        name: String
      };

      g.define('person3', s);
      g.types.should.include('person3');
    });

    it('should have all types included', function () {
      g.types.length.should.equal(3);
    });
  });

  describe('adding basic data', function () {
    var g = new Graph()
      , spy = chai.spy(function (person) {
          should.exist(person);
          person.flag('type').should.equal('person');
      });

    g.define('person', Person);

    it('should emit `add` events', function () {
      g.on('add:person:*', spy);
    });

    it('should allow data to be set by address', function () {
      var a = g.set('person', arthur._id, arthur)
        , f = g.set('person', ford._id, ford);
      g.length.should.equal(2);
      a.id.should.equal(arthur._id);
      f.id.should.equal(ford._id);
      a._attributes.should.deep.equal(arthur);
      f._attributes.should.deep.equal(ford);
    });

    it('should have called all callbacks', function () {
      spy.should.have.been.called.twice;
    });
  });

  describe('filter/find', function () {
    var g = new Graph();

    g.define('person', Person);
    g.define('location', Location);

    g.set('person', arthur._id, arthur);
    g.set('person', ford._id, ford);
    g.set('location', earth._id, earth);
    g.set('location', ship._id, ship);

    it('should provide a hash when find by attr', function () {
      var res = g.find({ 'name' : { $eq: 'Arthur Dent' } });
      res.should.have.length(1);
      res.should.be.instanceof(seed.Hash);
    });

    it('should allow for filter by type', function () {
      var res = g.filter('person');
      res.should.have.length(2);
      res.should.be.instanceof(seed.Hash);
    });

    it('should allow for filter by iterator', function () {
      var res = g.filter(function (m) {
        return m.get('stats.occupation') == 'traveller';
      });
      res.should.have.length(2);
      res.should.be.instanceof(seed.Hash);
    });

    it('should allow for filter by type + iterator', function () {
      var res = g.filter('person', function (m) {
        return m.id == 'arthur';
      });
      res.should.have.length(1);
      res.should.be.instanceof(seed.Hash);
    });

    it('should returned undefined for bad formed filter', function () {
      var res = g.filter();
      should.not.exist(res);
    });

    it('should allow for filter then find', function () {
      var res = g.filter('person').find({ 'name': { $eq: 'Arthur Dent' }});
      res.should.have.length(1);
      res.should.be.instanceof(seed.Hash);
    });

    it('should allow for filters by nested attribute', function () {
      var res = g.find({ 'stats.species' : { $eq: 'human' } });
      res.should.have.length(1);
      res.should.be.instanceof(seed.Hash);
    });

  });

  describe('iteration', function () {
    var g = new Graph();

    g.define('person', Person);
    g.define('location', Location);

    g.set('person', arthur._id, arthur);
    g.set('person', ford._id, ford);
    g.set('location', earth._id, earth);
    g.set('location', ship._id, ship);

    it('should allow for iteration through all objects', function () {
      var i = 0;
      g.each(function (m) {
        i++;
      });
      i.should.equal(4);
    });

    it('should allow for iteration through specific types', function () {
      var i = 0;
      g.each('person', function (m) {
        i++;
      });
      i.should.equal(2);
    });
  });

  describe('flush', function () {

    var g = new Graph();

    g.define('person', Person);
    g.define('location', Location);

    beforeEach(function () {
      g.set('person', arthur._id, arthur);
      g.set('person', ford._id, ford);
      g.set('location', earth._id, earth);
      g.set('location', ship._id, ship);
    });

    it('should allow flushing', function () {
      var spy = chai.spy();
      g.should.have.length(4);
      g.on([ 'flush', 'all' ], spy);
      g.flush();
      g.should.have.length(0);
      spy.should.have.been.called.once;
    });

    it('should allow flushing by type', function () {
      var spy = chai.spy();
      g.should.have.length(4);
      g.on([ 'flush', 'person'], spy);
      g.flush('person');
      g.should.have.length(2);
      spy.should.have.been.called.once;
    });
  });

  describe('using schema', function () {
    var PersonSchema = new seed.Schema({
        _id: seed.Schema.Type.ObjectId
      , name: String
      , stats: Object
    });

    var Spaceman = Person.extend('spaceman', { schema: PersonSchema })
      , graph = new seed.Graph('spacemen')
      , spaceman;

    before(function () {
      graph.define(Spaceman);
    });

    it('can set attributes of a new model', function () {
      var spaceman = graph.set('spaceman', arthur);
      spaceman.should.have.property('_attributes')
        .deep.equal(arthur);
    });

  });

});
