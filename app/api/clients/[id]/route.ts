import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { id } = await params

    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name, document, telefone,due_day, created_at')
      .eq('id', id)
      .eq('office_id', payload.officeId)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, document, due_day, telefone } = body

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
    }

    if (due_day !== undefined && due_day !== null) {
      const day = Number(due_day)
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return NextResponse.json({ error: 'due_day must be between 1 and 31' }, { status: 400 })
      }
    }

    if (telefone !== undefined && telefone !== null) {
      if (telefone.length < 10 || telefone.length > 11) {
        return NextResponse.json({ error: 'Telefone deve ter entre 10 e 11 dígitos' }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (document !== undefined) updateData.document = document?.trim() || null
    if (due_day !== undefined) updateData.due_day = due_day
    if (telefone !== undefined) updateData.telefone = telefone || null

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('office_id', payload.officeId)
      .select('id, name, document, telefone, due_day, created_at')
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { id } = await params

    const { error, count } = await supabase
      .from('clients')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('office_id', payload.officeId)

    if (error || count === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
