package store

type KVStore struct {
	data map[string]string
}

// NewKVStore creates a new instanced in-memory key-value database.
func NewKVStore() *KVStore {
	return &KVStore{data: make(map[string]string)}
}

// Set stores a key-value pair in memory.
func (s *KVStore) Set(key, value string) {
	s.data[key] = value
}

// Get retrieves a value by key.
func (s *KVStore) Get(key string) (string, bool) {
	val, ok := s.data[key]
	return val, ok
}

// Delete removes a key and returns true if it existed.
func (s *KVStore) Delete(key string) bool {
	_, ok := s.data[key]
	if ok {
		delete(s.data, key)
		return true
	}
	return false
}
