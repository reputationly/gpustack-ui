import { PaginationKey, TABLE_SORT_DIRECTIONS } from '@/config/settings';
import useTableFetch from '@/hooks/use-table-fetch';
import PageBox from '@/pages/_components/page-box';
import { AutoTooltip, StatusTag } from '@gpustack/core-ui';
import { useIntl } from '@umijs/max';
import { Button, Input, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import React from 'react';
import { downloadVideoResult, queryVideoTasks } from './apis';
import { ListItem, videoTaskStatus } from './config';

const stateText = (state: string) =>
  state ? state.charAt(0).toUpperCase() + state.slice(1) : '-';

const VideoTasks: React.FC = () => {
  const intl = useIntl();
  const {
    dataSource,
    queryParams,
    handlePageChange,
    handleTableChange,
    handleSearch,
    handleNameChange
  } = useTableFetch<ListItem>({
    key: PaginationKey.VideoTasks,
    fetchAPI: queryVideoTasks,
    polling: true
  });

  const columns: ColumnsType<ListItem> = [
    {
      title: intl.formatMessage({ id: 'videoTasks.table.taskId' }),
      dataIndex: 'task_id',
      width: 260,
      render: (text: string) => (
        <AutoTooltip ghost maxWidth={240} title={text}>
          {text}
        </AutoTooltip>
      )
    },
    {
      title: intl.formatMessage({ id: 'videoTasks.table.model' }),
      dataIndex: 'model_name',
      render: (text: string) => (
        <AutoTooltip ghost maxWidth={200}>
          {text || '-'}
        </AutoTooltip>
      )
    },
    {
      title: intl.formatMessage({ id: 'videoTasks.table.type' }),
      dataIndex: 'task_type',
      width: 100
    },
    {
      title: intl.formatMessage({ id: 'videoTasks.table.user' }),
      dataIndex: 'user_id',
      width: 120
    },
    {
      title: intl.formatMessage({ id: 'common.table.status' }),
      dataIndex: 'state',
      width: 140,
      render: (state: string, record: ListItem) => (
        <StatusTag
          maxTooltipWidth={400}
          statusValue={{
            status: videoTaskStatus[state] as any,
            text: stateText(state),
            message: record.state_message || ''
          }}
        />
      )
    },
    {
      title: intl.formatMessage({ id: 'common.table.createTime' }),
      dataIndex: 'created_at',
      width: 180,
      sorter: true,
      render: (text: string) =>
        text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: intl.formatMessage({ id: 'common.table.operation' }),
      width: 120,
      render: (_: any, record: ListItem) => (
        <Button
          type="link"
          size="small"
          disabled={record.state !== 'done'}
          onClick={() =>
            downloadVideoResult(
              record.task_id,
              record.nfs_path?.split('/').pop()
            )
          }
        >
          {intl.formatMessage({ id: 'videoTasks.button.download' })}
        </Button>
      )
    }
  ];

  return (
    <PageBox>
      <div style={{ margin: '30px 0 22px' }}>
        <Input.Search
          allowClear
          style={{ width: 300 }}
          placeholder={intl.formatMessage({
            id: 'videoTasks.search.placeholder'
          })}
          onChange={handleNameChange}
          onSearch={handleSearch}
        />
      </div>
      <Table
        columns={columns}
        sortDirections={TABLE_SORT_DIRECTIONS}
        showSorterTooltip={false}
        tableLayout="auto"
        className="scroll-table"
        dataSource={dataSource.dataList}
        loading={{ spinning: dataSource.loading, size: 'middle' }}
        rowKey="id"
        scroll={{ x: 900 }}
        onChange={handleTableChange}
        pagination={{
          size: 'middle',
          showSizeChanger: true,
          pageSize: queryParams.perPage,
          current: queryParams.page,
          total: dataSource.total,
          onChange: handlePageChange
        }}
      />
    </PageBox>
  );
};

export default VideoTasks;
