local filepath, filename, fileext = string.match(arg[0], "(.-)([^\\]-([^\\%.]+))$")
--package.path = filepath .. 'athena-343-local.lua;' .. filepath .. '../../contract/new_multisig2of4.lua;'.. package.path
package.path = filepath .. '?.lua;' .. filepath .. '../../contract/?.lua;'.. package.path

require "athena-343-local"
require "multisig2of4"

local suite = TestSuite('test suite for multisig wallet')


suite:add(TestCase('check type test', function()
  assertEquals(5, 5)

  assertTrue(pcall(function() _typecheck('StrValue', 'string') end))
  assertTrue(pcall(function() _typecheck(12345, 'number') end))
  assertTrue(pcall(function() _typecheck({1,2,'x'}, 'table') end))
  assertTrue(pcall(function() _typecheck(nil, 'nil') end))
  assertTrue(pcall(function() _typecheck('AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq', 'address') end))
  assertTrue(pcall(function() _typecheck('AmQLSEi7oeW9LztxGa8pXKQDrenzK2JdDrXsJoCAh6PXyzdBtnVJ', 'address') end))
  assertTrue(pcall(function() _typecheck('1mQLSEi7oeW9LztxGa8pXKQDrenvK2JdDrXsJoCAh6PXyzdBtnVJ', 'address') end))
    
  assertError(function() _typecheck('StrValue', 'number') end, 'string != number')
  assertError(function() _typecheck(12345, 'string') end, 'number != string')
  assertError(function() _typecheck('AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3Yd', 'address') end, 
    'invalid address length')
  assertError(function() _typecheck('AmQLSEi7oeW9LztxGa8pXKQDrenzK2JdDrXsJoCAh6PXyzdBtnVJ1', 'address') end, 
    'invalid address length')
  assertError(function() _typecheck('1mQLSEi7oeW9LztxGa8pXKQDrenvK2JdDrXsJoCAh6PXyzdBtnV@', 'address') end, 
    'contains invalid char @')
  assertError(function() _typecheck('1mQLSEi17oeW9LztxGa8pXKQDrenvK2JdDrXsJoCAh6PXyzddBtnV@', 'address') end, 
    'invalid address length')
   
end))


suite:add(TestCase('parse err test', function()

  function contract.balance() return 10000 end
  function system.getContractID() return 'tempContractID123' end
  
  assertError(function()  _parse('X') end, 'Unsupported request type')
  assertError(function()  _parse('ERR') end, 'Unsupported request type')
  assertError(function()  _parse(999) end, 'Unsupported request type')
  assertError(function()  _parse({1,2,3}) end, 'Unsupported request type')
  
end))


suite:add(TestCase('parse withdraw test', function()

  function contract.balance() return 10000 end
  function system.getContractID() return 'tempContractID123' end
  
  local amount, reciever = _parse('W', 5000, 'AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq')
  assertEquals(amount, 5000)
  assertEquals(reciever, 'AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq')
  
  -- with exceeding number of args
  amount, reciever = _parse('W', 5000, 'AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq', 'more values will be ignored', 999)
  assertEquals(amount, 5000)
  assertEquals(reciever, 'AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq')
  
  -- with invalid type of args
  assertError(function()  _parse('W', nil, 'AmNmMUdbATfbB6Zh2SxPLgNnKQ3TX4EiDzSSQdT12hqvyA3YdWtq', 5000) end, 'nil != bignum')
  assertError(function()  _parse('W') end, 'nil != bignum')
  
  
end))


suite:add(TestCase('genmsg test', function()
 -- TODO
end))



suite:run()
