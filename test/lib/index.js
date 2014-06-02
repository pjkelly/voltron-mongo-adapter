var MongoAdapter = require('../../lib/adapters/mongo');

var mongoAdapter;
var person;
describe('MongoAdapter', function(){
  
  describe('connection by url', function(){
    var connection;

    before(function(){
      var connectionOptions = {
        url: 'mongodb://localhost/integration_test'
      };
      MongoAdapter.configure(connectionOptions);
    });

    it('defines #connect', function(){
      expect(MongoAdapter.connect).to.be.a('function');
    });

    it('returns a promise from #connect', function(){
      connection = MongoAdapter.connect();
      expect(connection).to.have.property('then');
      expect(connection.then).to.be.a('function');
    });
    
  });
  
  describe('connection by explicit connection values', function(){
    var connection;

    before(function(){
      var connectionOptions = {
        db: 'integration_test',
        server: 'localhost',
        port: '27017'
      };
      MongoAdapter.configure(connectionOptions);
    });

    it('defines #connect', function(){
      expect(MongoAdapter.connect).to.be.a('function');
    });

    it('returns a promise from #connect', function(){
      connection = MongoAdapter.connect();
      expect(connection).to.have.property('then');
      expect(connection.then).to.be.a('function');
    });
    
  });

  describe('#Constructor', function(){
    
    before(function(){
      mongoAdapter = new MongoAdapter('integration_test', {});
    });
    
    it('is successful', function(){
      expect(mongoAdapter).to.be.an.instanceOf(MongoAdapter);
    });

    describe('#findAll', function(){
      var documents;

      before(function( done ){
        mongoAdapter.findAll().then(function( docs ) {
          documents = docs;
          done();
        }).fail(function(err){
          throw Error(err);
          done();
        });
      });

      it('returns an empty set', function(){
        expect(documents).to.be.an.instanceOf(Array);
      });
      
    });
    
  });

  describe('#save', function(){
    
    before(function(done){
      var attributes = {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'm'
      };
      mongoAdapter.save(attributes, function( err, doc ) {
        person = doc[0];
        done();
      })
    });

    it('creates a document', function(){
      expect(person.firstName).to.equal('John');
    });

  });

  describe('#findOne', function(){
    var foundDocument;

    before(function(done){
      mongoAdapter.findOne({ firstName: 'John' }).then(function( doc ) {
        foundDocument = doc;
        done();
      });
    });

    it('finds the matching document', function(){
      expect(foundDocument.firstName).to.equal('John');
    });
    
  });

  describe('#findAll', function(){
    var foundDocuments;
    
    before(function(done){
      mongoAdapter.findAll().then(function( docs ) {
        foundDocuments = docs;
        done();
      })
    });

    it('returns an array of found documents', function(){
      expect(foundDocuments).to.be.an.instanceOf(Array);
      expect(foundDocuments).to.have.length(1);
    });
    
  });

  describe('#update', function(){
    
    before(function(done){
      mongoAdapter.update({ firstName: 'John' }, {$set: { lastName: 'Williams' }}).then(function() {
        return mongoAdapter.findOne({ firstName: 'John' });
      })
      .then(function( doc ) {
        person = doc;
        done();
      })
    });
    
    it('updates the document', function(){
      expect(person.lastName).to.equal('Williams');
      expect(person.firstName).to.equal('John');
    });

  });

  describe('#remove', function(){
    
    before(function(done){
      mongoAdapter.remove(person._id).then(function() {
        return mongoAdapter.findOne({ firstName: 'John' })
      })
      .then(function( doc ) {
        person = doc;
        done();
      })
    });

    it('removes the document from the collection', function(){
      expect(person).to.be.null;
    });
    
  });
  
});