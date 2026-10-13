import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { changePasswordSchema, type ChangePasswordFormData } from '@/validators/auth'

export default function ChangePasswordPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const { mutate, isPending, error, isSuccess } = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      authApi.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onSuccess: () => {
      reset()
    },
  })

  const onSubmit = (data: ChangePasswordFormData) => mutate(data)

  const apiError =
    error && 'response' in (error as object)
      ? (error as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail
      : null

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow-md p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
        <p className="text-sm text-gray-500 mt-1">Update your account password</p>
      </div>

      {isSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            {...register('current_password')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.current_password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.current_password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            {...register('new_password')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.new_password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.new_password.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            {...register('confirm_password')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {apiError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {apiError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
