export const nextJsConfig1 = `
const withSass = require('@zeit/next-sass')
module.exports = withSass({
  env: {
    SUPABASE_URL: 'http://localhost:8000',
    SUPABASE_KEY: 'examplekey',
  },
})
`

export const store1 = `
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export const useStore = ({ channelId }) => {
  const [channels, setChannels] = useState(new Array())
  const [messages, setMessages] = useState(new Array())
  const [users] = useState(new Map())

  // Fetches messages for the channel and starts the channel listeners
  const reloadStore = () => {
    if (channelId) {
        console.log('channelId', channelId)
      fetchChannels(setChannels)
      fetchMessages(channelId, setMessages)
    }
  }

  // Update the store when the user changes the "channel"
  useEffect(reloadStore, [channelId])

  // Export computed properties to use in our app
  return {
    messages: messages.map(x => ({ ...x, author: users.get(x.user_id) })),
    channels: channels.sort((a, b) => a.slug.localeCompare(b.slug)),
    users,
  }
}

export const fetchChannels = async callback => {
  try {
    let { body } = await supabase.from('channels').select('*')
    if (callback) callback(body)
    return body
  } catch (error) {
    console.log('error', error)
  }
}

export const fetchMessages = async (channelId, callback) => {
  try {
    let { body } = await supabase
      .from('messages')
      .eq('channel_id', channelId)
      .select(\`*, author:user_id(*)\`)
      .order('id', true)
    if (callback) callback(body)
    return body
  } catch (error) {
    console.log('error', error)
  }
}

`

export const schema = `
-- USERS
CREATE TABLE public.users (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  username text
);
-- CHANNELS
CREATE TABLE public.channels (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE
);
-- MESSAGES
CREATE TABLE public.messages (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  message text,
  user_id bigint REFERENCES users NOT NULL,
  channel_id bigint REFERENCES channels NOT NULL
);
-- Create the Replication publication for Supabase
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
-- SOME DUMMY DATA
INSERT INTO
    public.users (username)
VALUES
    ('jarvis'),
    ('tonystark');
INSERT INTO
    public.channels (slug)
VALUES
    ('public'),
    ('random');
INSERT INTO
    public.messages (message, channel_id, user_id)
VALUES
    ('Hello World 👋', 1, 1),
    ('Goodbye cruel world.', 2, 1);
`

export const dockerfile = `
version: '3'

services:
  supabase:
    image: supabase/supabase-dev:latest
    ports:
      - "8000:8000"
    environment:
      DB_HOST: db
      DB_NAME: postgres
      DB_USER: postgres
      DB_PASSWORD: postgres
      DB_PORT: 5432
      DB_SCHEMA: public
    depends_on:
      - db
  db:
    image: postgres:12
    ports:
      - "5432:5432"
    volumes:
      - ./db:/docker-entrypoint-initdb.d/
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_PORT: 5432
`

export const channelPage1 = `
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useStore } from '../lib/Store'

const ChannelsPage = props => {
  const router = useRouter()
  const { channelId } = router.query
  const { messages, channels } = useStore({ channelId })

  return (
    <div>
      <nav>
        <div>
          <button>New Channel</button>
        </div>
        <div>
          <h3>Channels</h3>
        </div>
        <ul>
          {channels.map(channel => (
            <li>
              <Link href="/[channelId]" as={\`/\${channel.id}\`}>
                <a>{channel.slug}</a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main>
        <div>
          <h3>Messages</h3>
        </div>
        {messages.map(message => (
          <div>
            <p>
              <strong>{message.author.username}</strong>
            </p>
            <p>{message.message}</p>
          </div>
        ))}
      </main>
    </div>
  )
}

export default ChannelsPage
`