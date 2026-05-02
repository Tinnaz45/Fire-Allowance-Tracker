import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock supabase so tests run without env vars
jest.mock('../lib/supabase', () => ({
  supabase: {},
  stationName: jest.fn(() => ''),
  STATIONS: [],
}))

import { StatusBadge } from '../components/UI'

describe('StatusBadge', () => {
  it('renders Paid status', () => {
    render(<StatusBadge status="Paid" />)
    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('renders Pending status', () => {
    render(<StatusBadge status="Pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders Disputed status', () => {
    render(<StatusBadge status="Disputed" />)
    expect(screen.getByText('Disputed')).toBeInTheDocument()
  })
})
