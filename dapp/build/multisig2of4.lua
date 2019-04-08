------------------------------------------------------------------------------
-- Multisig 2 of 4 Wallet stores aergo, stakes, unstakes, and votes using it
-- @author sunpuyo@gmail.com
-- @see https://www.blocko.io/
------------------------------------------------------------------------------

function _typecheck(x, f)
  if (x and f == 'address') then
    assert(type(x) == 'string', "address must be string type")
    -- check address length
    assert(52 == #x, string.format("invalid address length: %s (%s)", x, #x))
    -- check character
    local invalidChar = string.match(x, '[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]')
    assert(nil == invalidChar,
      string.format("invalid address format: %s contains invalid char %s", x, invalidChar))
  elseif (x and f == 'bignum') then
    -- check bignum
    assert(bignum.isbignum(x), string.format("invalid format: %s != %s", type(x), f))
  else
    -- check default lua types
    assert(type(x) == f, string.format("invalid format: %s != %s", type(x), f))
  end
end

-- Parse input variable args and return according to a type of following request.
-- [Common input] type of request; must be one of W(withdraw), S(stake), U(unstake), V(vote)
-- [withdraw]
--  in: type, (bignum) amount, (address) receiver_address
--  out: (bignum) amount, (address) receiver_address, nil
-- [stake]
--  in: type, (bignum) amount
--  out: (bignum) amount, nil, nil
-- [unstake]
--  in: type, (bignum) amount
--  out: (bignum) amount, nil, nil
-- [vote] string
--  in: type, (string) peer_id_1, (string) peer_id_2, (string) peer_id_3, ...
--  out: nil, nil, (string) peer_id_1, (string) peer_id_2, (string) peer_id_3, ...
function _parse(type, ...)
  if type == 'W' then
    local amount, receiver = unpack({...})
    _typecheck(amount, 'bignum')
    _typecheck(receiver, 'address')
    assert(receiver ~= system.getContractID() , "Invalid Destination")
    assert(bignum.compare(bignum.number(contract.balance()), amount) >= 0, "Insufficient Balance")

    return amount, receiver, nil

  elseif type == 'S' then
    local amount = unpack({...})
    _typecheck(amount, 'bignum')
    assert(bignum.compare(bignum.number(contract.balance()), amount) >= 0, "Insufficient Balance")

    return amount, nil, nil

  elseif type == 'U' then
    local amount = unpack({...})
    _typecheck(amount, 'bignum')

    return amount, nil, nil

  elseif type == 'V' then
    for i, ballot in pairs({...}) do
      _typecheck(ballot, 'string')
    end

    return nil, nil, {...}

  else
    error('Unsupported request type')
  end
end

-- combine input args and generage a msg to request sign
function _genMsg(reqType, amount, receiver, ballots)
  local msg = reqType
  if ballots ~= nil then
    -- append multiple ballots
    for i, ballot in pairs(ballots) do
      msg = msg..ballot
    end
  end
  -- append rest args
  msg = msg..(receiver or '')..(amount ~= nil and bignum.tostring(amount) or '')..tostring(Nonce:get())..system.getContractID()

  return crypto.sha256(msg)
end

-- Global State Variables
state.var {
  Nonce = state.value(), -- number
  Owners = state.array(4), -- address
}

-- Create contract with given 4 owner addresses
-- each address must be address type and different each others
function constructor(addr_owner1, addr_owner2, addr_owner3, addr_owner4)
  _typecheck(addr_owner1, 'address')
  _typecheck(addr_owner2, 'address')
  _typecheck(addr_owner3, 'address')
  _typecheck(addr_owner4, 'address')

  assert(addr_owner1 ~= addr_owner2 and addr_owner1 ~= addr_owner3 and addr_owner1 ~= addr_owner4
    and addr_owner2 ~= addr_owner3 and addr_owner2 ~= addr_owner4 and addr_owner3 ~= addr_owner4,
    "Owner must be different each others")

  Owners[1] = addr_owner1
  Owners[2] = addr_owner2
  Owners[3] = addr_owner3
  Owners[4] = addr_owner4

  Nonce:set(0)
end

function default()
    contract.event("deposit", system.getSender(), system.getAmount())
end

function genMsgToSign(type, ...)
    local amount, receiver, ballots = _parse(type, ...)

    return _genMsg(type, amount, receiver, ballots)
end

function request(str_reqType, num_ownerId1, str_signedMsgOwner1,  num_ownerId2, str_signedMsgOwner2, ...)
  -- check owner
  assert(num_ownerId1 ~= num_ownerId2, "Signers cannot be same")

  -- generate message internally
  local amount, receiver, ballots = _parse(str_reqType, ...)
  local msg = _genMsg(str_reqType, amount, receiver, ballots)

  -- check sign
  assert(crypto.ecverify(msg, str_signedMsgOwner1, Owners[num_ownerId1]), "Invalid Signature of "..num_ownerId1)
  assert(crypto.ecverify(msg, str_signedMsgOwner2, Owners[num_ownerId2]), "Invalid Signature of "..num_ownerId2)

  -- increase nonce
  Nonce:set(Nonce:get() + 1)

  -- perform request
  if str_reqType == 'W' then
    contract.send(receiver, amount)
    contract.event('withdraw', amount, receiver)
  elseif str_reqType == 'S' then
    contract.stake(amount)
    contract.event('stake', amount)
  elseif str_reqType == 'U' then
    contract.unstake(amount)
    contract.event('unstake', amount)
  elseif str_reqType == 'V' then
    contract.vote(unpack(ballots))
    contract.event('vote', unpack(ballots))
  end
end

function getOwners()
  return 1, Owners[1], 2, Owners[2], 3, Owners[3], 4, Owners[4]
end

abi.payable(constructor, default)
abi.register(request)
abi.register_view(genMsgToSign, getOwners)
